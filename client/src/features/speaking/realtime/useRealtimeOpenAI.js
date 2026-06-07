// Minimal WebRTC client for OpenAI Realtime API
// Browser: fetch ephemeral token from server, then connect via WebRTC

export function createRealtimeAgent() {
  let pc = null;
  let micStream = null;
  let remoteAudioEl = null;
  let sessionTimer = null;
  let dataChannel = null;
		let hasSentSessionInstructions = false;

  const isSupported = () => typeof RTCPeerConnection !== 'undefined';

	/**
	 * start options:
	 * - audioEl
	 * - onConnected
	 * - onError
	 * - maxDurationMs
	 * - onTranscriptionUpdate({ transcript, isPartial, isComplete, eventType })
	 * - onAgentMessage({ type: 'delta'|'done'|'question'|'part'|'feedback', text, meta })
	 * - onFeedback({ pronunciation, fluency, lexical, grammar, band?, comment? })
	 */
	const start = async ({ audioEl, onConnected, onError, maxDurationMs, onTranscriptionUpdate, onAgentMessage, onFeedback } = {}) => {
    try {
      if (!isSupported()) throw new Error('WebRTC not supported');

      remoteAudioEl = audioEl || new Audio();
      remoteAudioEl.autoplay = true;

      // 1) Get ephemeral token from server (try /api/speaking/realtime/token first, then fallbacks)
      const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) 
        || (typeof window !== 'undefined' && window.__SERVER_URL__) 
        || 'https://ielts-coach-backend.onrender.com';
      let resp, session;
      
      try {
        // Try /api/speaking/realtime/token first (new endpoint)
        resp = await fetch(`${SERVER_URL}/api/speaking/realtime/token`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!resp.ok) {
          // Fallback to voice session endpoint
          console.log('🔄 /api/speaking/realtime/token failed, trying /api/voice/session...');
          resp = await fetch(`${SERVER_URL}/api/voice/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!resp.ok) {
            // Fallback to auth endpoint
            console.log('🔄 /api/voice/session failed, trying /api/auth/realtime-token...');
            resp = await fetch(`${SERVER_URL}/api/auth/realtime-token`);
            
            if (!resp.ok) {
              const errorData = await resp.json().catch(() => ({ message: 'Unknown error' }));
              throw new Error(`All endpoints failed. Last error: ${errorData.message || resp.statusText}`);
            }
          }
        }
        
        session = await resp.json();
        console.log('📋 Session response keys:', Object.keys(session));
        console.log('🔑 client_secret exists:', !!session.client_secret);
        console.log('🆔 session ID:', session.id || session.session_id);
      } catch (e) {
        console.error('❌ Error fetching realtime token:', e);
        throw new Error(`Failed to get realtime token: ${e.message}`);
      }
      
      // Log the full session object for debugging
      console.log('📋 Full session object:', session);
      
      if (!session) {
        throw new Error('No session data received from server');
      }
      
      // Check for client_secret in various possible locations
      let clientSecretValue = null;
      
      if (session.client_secret) {
        // Direct client_secret - must have .value property
        if (typeof session.client_secret === 'string') {
          // If it's a string, use it directly (legacy format)
          clientSecretValue = session.client_secret;
        } else if (session.client_secret.value) {
          // Prefer .value property (correct format)
          clientSecretValue = session.client_secret.value;
        } else {
          // Fallback to the object itself (shouldn't happen)
          clientSecretValue = session.client_secret;
        }
      } else if (session.data?.client_secret) {
        // Nested in data object
        if (typeof session.data.client_secret === 'string') {
          clientSecretValue = session.data.client_secret;
        } else if (session.data.client_secret?.value) {
          clientSecretValue = session.data.client_secret.value;
        } else {
          clientSecretValue = session.data.client_secret;
        }
      }
      
      if (!clientSecretValue) {
        console.error('❌ client_secret not found in session:', {
          hasClientSecret: !!session.client_secret,
          hasData: !!session.data,
          sessionKeys: Object.keys(session),
          clientSecretType: typeof session.client_secret,
          clientSecretValue: session.client_secret?.value ? 'exists' : 'missing'
        });
        throw new Error('client_secret.value not found in session response. Check server logs for details.');
      }
      
      // Validate it's a string (not an object)
      if (typeof clientSecretValue !== 'string') {
        console.error('❌ client_secret.value is not a string:', typeof clientSecretValue, clientSecretValue);
        throw new Error('client_secret.value must be a string, but got: ' + typeof clientSecretValue);
      }
      
      console.log('✅ client_secret.value found:', clientSecretValue.substring(0, 20) + '...');
      console.log('✅ client_secret.value length:', clientSecretValue.length);
      
      console.log('✅ Session created:', {
        sessionId: session.id || 'N/A',
        type: 'session-started',
        hasClientSecret: !!clientSecretValue,
        clientSecretType: typeof session.client_secret
      });

      // 2) Create PeerConnection
      pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });

		// 3) Create data channel for text messages (oai-events)
      // Note: OpenAI Realtime API uses this channel to send events (transcriptions, responses, etc.)
      dataChannel = pc.createDataChannel('oai-events');
		dataChannel.onopen = () => {
        console.log('✅ Data channel opened for text messages');
        console.log('📡 Data channel ready state:', dataChannel.readyState);

			// Send session instructions to run a full IELTS Part 1/2/3 style conversation.
			// AI behaves like a real examiner: one short question at a time, listens
			// patiently for ~2s of silence (handled by server VAD), then continues.
			try {
				if (!hasSentSessionInstructions) {
					const ieltsInstructions = `You are a calm, professional IELTS Speaking examiner. The candidate is on a live voice call with you, exactly like a face-to-face exam. Follow IELTS rules strictly.

CORE BEHAVIOUR
- Speak only when it is your turn. Wait for the candidate to finish completely (server VAD will hand the turn back to you).
- Ask ONE short question at a time. Keep your replies to 1-2 sentences (~15-25 words). Never lecture.
- Do NOT teach, correct mistakes, or reveal any score during the exam.
- Reference specific things the candidate just said when you ask follow-ups.
- If the candidate stalls, say once, kindly: "Take your time." Do not pressure them.

TEST STRUCTURE — run in order, do not skip:
1) GREETING (1 line): "Good day. My name is Alex and I'll be your examiner today. Could you please tell me your full name?"
2) PART 1 — Introduction & Interview (about 4-5 minutes, 8-12 short questions):
   - Start with: "And where are you from?" then "Do you work or are you a student?"
   - Then cover 2-3 familiar topics (hobbies, daily routine, food, weather, hometown, family, travel, technology). 3-4 Qs per topic.
   - Each question must be short and concrete. No abstract questions yet.
3) PART 2 — Cue Card (3-4 minutes):
   - Announce: "Now I'm going to give you a topic and I'd like you to talk about it for one to two minutes. You'll have one minute to prepare. Your topic is:"
   - Then state ONE "Describe..." cue card with 3-4 "You should say:" bullets and an "and explain why..." line.
   - Say: "You have one minute to prepare. I will tell you when to start." Then go silent.
   - After roughly 60 seconds say: "Alright, please begin speaking. You have up to two minutes."
   - While the candidate speaks for the long turn, DO NOT interrupt at all. Wait until they clearly finish or until ~2 minutes pass, then ask one short rounding-off question.
4) PART 3 — Discussion (about 4-5 minutes, 5-7 abstract Qs linked to the Part 2 topic):
   - Move from concrete to abstract: comparisons, reasons, society, future, opinions.
   - One follow-up per answer when natural; otherwise move to the next question.
5) CLOSING (1 line): "Thank you. That is the end of the speaking test."

DO NOT
- Do not say "you have not answered me" or any negative pressure.
- Do not switch language.
- Do not give the user the answer or model sentences.
- Do not announce the part numbers out loud ("Now Part 1") — just transition naturally.
- Do not produce long monologues. If your reply is more than 2 sentences, cut it short.

TOPIC POOL (rotate, do NOT repeat the same topic in the same call): daily routine, hometown, food, weather, hobbies, music, sport, books, films, travel, technology, education, work, family, friends, shopping, festivals, environment, art, health.`;

					// Persist for the whole call
					const sessionUpdate = {
						type: 'session.update',
						session: {
							instructions: ieltsInstructions,
							modalities: ['audio', 'text'],
							// Mirror the server VAD config — patient turn-taking.
							// threshold 0.5 (default) so quiet speakers aren't ignored;
							// prefix_padding 500ms so the first syllable isn't clipped;
							// silence_duration 2000ms so the examiner doesn't cut in.
							turn_detection: {
								type: 'server_vad',
								threshold: 0.5,
								prefix_padding_ms: 500,
								silence_duration_ms: 2000,
							},
							// MUST stay on or the candidate's words never get
							// transcribed and the final scorer gets an empty payload.
							input_audio_transcription: { model: 'whisper-1' },
						},
					};

					dataChannel.send(JSON.stringify(sessionUpdate));

					// Kick off Part 1 with the standard examiner greeting.
					const startPartOne = {
						type: 'response.create',
						response: {
							instructions: 'Greet the candidate exactly as in your instructions (one short line) and then ask only for their full name. Do not ask anything else yet.',
							modalities: ['audio', 'text'],
						},
					};

					dataChannel.send(JSON.stringify(startPartOne));

					hasSentSessionInstructions = true;
					console.log('✅ Sent IELTS session instructions and started Part 1');
				}
			} catch (e) {
				console.warn('⚠️ Failed to send session instructions:', e);
			}
      };
      dataChannel.onclose = () => {
        console.log('⚠️ Data channel closed');
      };
      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
      };
      dataChannel.onmessage = (event) => {
        try {
          // Parse JSON event from OpenAI Realtime API.
          const eventData = JSON.parse(event.data);
          const t = eventData.type || '';

          // Log every event type once with a short preview — invaluable when
          // diagnosing "speech not detected" issues. Audio deltas are dropped
          // from the log because they fire dozens of times per second.
          if (t !== 'response.audio.delta' && t !== 'response.audio_transcript.delta') {
            console.log('📨 Realtime event:', t);
          }

          // ── AI SPEECH ── OpenAI streams what the AI is speaking as audio transcript
          //    deltas. We forward both deltas (so the UI can show the AI's words
          //    live, like Whisper subtitles) and the final transcript when done.
          if (t === 'response.audio_transcript.delta' && onAgentMessage) {
            const textDelta = typeof eventData.delta === 'string' ? eventData.delta : '';
            if (textDelta) onAgentMessage({ type: 'delta', text: textDelta });
            return;
          }
          if (t === 'response.audio_transcript.done' && onAgentMessage) {
            const finalText = typeof eventData.transcript === 'string' ? eventData.transcript : '';
            onAgentMessage({ type: 'done', text: finalText });
            return;
          }

          // ── AI TEXT-ONLY responses (when modality includes text without audio)
          if (t === 'response.text.delta' && onAgentMessage) {
            const textDelta = typeof eventData.delta === 'string' ? eventData.delta : '';
            if (textDelta) onAgentMessage({ type: 'delta', text: textDelta });
            return;
          }
          if (t === 'response.text.done' && onAgentMessage) {
            const finalText = typeof eventData.text === 'string' ? eventData.text : '';
            onAgentMessage({ type: 'done', text: finalText });
            return;
          }

          // ── End-of-turn safety net: when the AI completes a full response,
          //    flush whatever transcript we have so the UI commits the message
          //    to the conversation history even if the .done event was missed.
          if ((t === 'response.completed' || t === 'response.done') && onAgentMessage) {
            onAgentMessage({ type: 'done', text: '' });
            return;
          }

          // ── USER SPEECH ── Server VAD lifecycle + final transcription
          if (t === 'input_audio_buffer.speech_started' && onTranscriptionUpdate) {
            onTranscriptionUpdate({
              transcript: '',
              isPartial: true,
              isComplete: false,
              eventType: t,
              speechStarted: true,
            });
            return;
          }
          if (t === 'input_audio_buffer.speech_stopped' && onTranscriptionUpdate) {
            onTranscriptionUpdate({
              transcript: '',
              isPartial: true,
              isComplete: false,
              eventType: t,
              speechStopped: true,
            });
            return;
          }
          if (t === 'conversation.item.input_audio_transcription.delta' && onTranscriptionUpdate) {
            const textDelta = typeof eventData.delta === 'string' ? eventData.delta : '';
            if (textDelta) {
              onTranscriptionUpdate({
                transcript: textDelta,
                isPartial: true,
                isComplete: false,
                eventType: t,
                isDelta: true,
              });
            }
            return;
          }
          if (t === 'conversation.item.input_audio_transcription.completed' && onTranscriptionUpdate) {
            const transcript = typeof eventData.transcript === 'string' ? eventData.transcript : '';
            onTranscriptionUpdate({
              transcript,
              isPartial: false,
              isComplete: true,
              eventType: t,
            });
            return;
          }
          if (t === 'conversation.item.input_audio_transcription.failed') {
            console.warn('⚠️ Whisper failed to transcribe user audio:', eventData);
            if (onTranscriptionUpdate) {
              onTranscriptionUpdate({
                transcript: '',
                isPartial: false,
                isComplete: true,
                eventType: t,
                failed: true,
                error: eventData.error?.message || 'Transcription failed',
              });
            }
            return;
          }
          // ── Fallback: some sessions deliver the user transcript only
          //    through `conversation.item.created` (when the input item
          //    is added to the conversation). Grab it from there too so
          //    speech is never lost.
          if (t === 'conversation.item.created' && onTranscriptionUpdate) {
            const item = eventData.item || {};
            if (item.role === 'user' && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (
                  part &&
                  (part.type === 'input_audio' || part.type === 'audio') &&
                  typeof part.transcript === 'string' &&
                  part.transcript.trim()
                ) {
                  onTranscriptionUpdate({
                    transcript: part.transcript.trim(),
                    isPartial: false,
                    isComplete: true,
                    eventType: t,
                    viaFallback: true,
                  });
                  return;
                }
              }
            }
          }
          // Server VAD committed audio — log it so we can see Whisper at
          // least received something even if transcription doesn't return.
          if (t === 'input_audio_buffer.committed') {
            console.log('🎤 Audio committed for transcription (item:', eventData.item_id, ')');
            return;
          }

          // ── Custom structured events the model may emit (kept for backwards compat)
          if (t === 'part.change' && onAgentMessage) {
            onAgentMessage({ type: 'part', text: null, meta: { part: eventData.part } });
            return;
          }
          if (t === 'question.asked' && onAgentMessage) {
            onAgentMessage({ type: 'question', text: eventData.text, meta: { part: eventData.part } });
            return;
          }
          if (t === 'feedback.inline' && onFeedback) {
            onFeedback(eventData.feedback);
            if (onAgentMessage) onAgentMessage({ type: 'feedback', text: null, meta: eventData.feedback });
            return;
          }
          if (t === 'cuecard.card' && onAgentMessage) {
            onAgentMessage({ type: 'question', text: eventData.topic, meta: { part: 2, bullets: eventData.bullets } });
            return;
          }

          // ── Server-side errors from the Realtime API
          if (t === 'error') {
            console.error('❌ Realtime API error event:', eventData?.error || eventData);
            return;
          }
        } catch (parseError) {
          console.log('📨 Realtime message (non-JSON):', event.data);
        }
      };
      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
      };

      // 4) Attach remote audio track to element for AI voice playback
      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        console.log('🎵 Received remote audio track from AI');
        console.log('📊 Track details:', {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streams: event.streams.length
        });
        
        remoteStream.addTrack(event.track);
        remoteAudioEl.srcObject = remoteStream;
        
        // Ensure audio plays automatically
        remoteAudioEl.play().then(() => {
          console.log('✅ AI audio started playing');
        }).catch(error => {
          console.warn('⚠️ Autoplay prevented, user interaction required:', error);
          // Try to play on user interaction
          document.addEventListener('click', () => {
            remoteAudioEl.play().catch(e => console.error('❌ Failed to play audio:', e));
          }, { once: true });
        });
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('🔌 WebRTC connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connected - AI can now hear and respond in real-time');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.error('❌ WebRTC connection failed or disconnected');
        }
      };
      
      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          console.log('✅ ICE connected - audio should be streaming now');
        } else if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed');
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate:', event.candidate.candidate.substring(0, 50) + '...');
        } else {
          console.log('✅ ICE gathering complete');
        }
      };
      
      // Handle ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('🧊 ICE gathering state:', pc.iceGatheringState);
      };

      // 5) Capture microphone and add tracks
      console.log('🎤 Requesting microphone access for Realtime API...');
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        console.log('✅ Microphone access granted for Realtime API');
        micStream.getTracks().forEach((track) => {
          console.log('🎤 Adding microphone track:', {
            id: track.id,
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState
          });
          pc.addTrack(track, micStream);
        });
        
        // Monitor track state
        micStream.getTracks().forEach(track => {
          track.onended = () => console.log('⚠️ Microphone track ended');
          track.onmute = () => console.warn('⚠️ Microphone track muted');
          track.onunmute = () => console.log('✅ Microphone track unmuted');
        });
      } catch (micError) {
        console.error('❌ Microphone access failed for Realtime API:', micError);
        // Clean up and re-throw
        if (pc) {
          pc.close();
          pc = null;
        }
        throw new Error(`Microphone access denied: ${micError.message || micError.name}. Please grant microphone permission and try again.`);
      }

      // 6) Create offer and wait for ICE gathering to complete for reliability
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', check);
        setTimeout(resolve, 1500); // fallback timeout
      });

      // 7) Send SDP to OpenAI Realtime API
      // Use the correct endpoint format: https://api.openai.com/v1/realtime?model=...
      // Get the model from session (should match what backend used)
      const model = session.model || 'gpt-4o-realtime-preview-2024-12-17';
      const realtimeEndpoint = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
      
      console.log('🔑 Using client_secret token (first 20 chars):', clientSecretValue.substring(0, 20) + '...');
      console.log('📋 SDP offer length:', pc.localDescription.sdp.length);
      console.log('🔗 Connecting to OpenAI Realtime API:', realtimeEndpoint);
      console.log('🤖 Using model:', model);
      
      const sdpResp = await fetch(realtimeEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecretValue}`,
          'Content-Type': 'application/sdp'
        },
        body: pc.localDescription.sdp
      });

      if (!sdpResp.ok) {
        const errorText = await sdpResp.text().catch(() => 'Unknown error');
        console.error('❌ SDP exchange failed:', sdpResp.status, errorText);
        console.error('📋 Response headers:', Object.fromEntries(sdpResp.headers.entries()));
        throw new Error(`SDP exchange failed: ${sdpResp.status} - ${errorText}`);
      }
      
      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      console.log('✅ SDP exchange succeeded');
      
      // Wait for connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏱️ Connection timeout - WebRTC did not connect within 10 seconds');
          console.error('📊 Current connection state:', pc.connectionState);
          console.error('📊 ICE connection state:', pc.iceConnectionState);
          reject(new Error('Connection timeout - WebRTC did not connect within 10 seconds'));
        }, 10000);
        
        const checkConnection = () => {
          console.log('📊 Connection state changed:', pc.connectionState);
          console.log('📊 ICE connection state:', pc.iceConnectionState);
          
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            pc.removeEventListener('connectionstatechange', checkConnection);
            console.log('✅ WebRTC connection fully established');
            console.log('📊 Final connection state:', pc.connectionState);
            console.log('📊 Final ICE connection state:', pc.iceConnectionState);
            resolve();
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            clearTimeout(timeout);
            pc.removeEventListener('connectionstatechange', checkConnection);
            console.error('❌ WebRTC connection failed:', pc.connectionState);
            console.error('📊 ICE connection state:', pc.iceConnectionState);
            reject(new Error(`WebRTC connection failed: ${pc.connectionState}`));
          }
        };
        
        // Log initial state
        console.log('📊 Initial connection state:', pc.connectionState);
        console.log('📊 Initial ICE connection state:', pc.iceConnectionState);
        
        if (pc.connectionState === 'connected') {
          clearTimeout(timeout);
          resolve();
        } else {
          pc.addEventListener('connectionstatechange', checkConnection);
        }
      });

      // Verify audio tracks are active
      console.log('📊 Checking audio tracks...');
      const senders = pc.getSenders();
      const receivers = pc.getReceivers();
      
      console.log('📤 Audio senders (microphone):', senders.length);
      senders.forEach((sender, i) => {
        if (sender.track) {
          console.log(`  Sender ${i}:`, {
            kind: sender.track.kind,
            enabled: sender.track.enabled,
            readyState: sender.track.readyState,
            muted: sender.track.muted
          });
        }
      });
      
      console.log('📥 Audio receivers (AI voice):', receivers.length);
      receivers.forEach((receiver, i) => {
        if (receiver.track) {
          console.log(`  Receiver ${i}:`, {
            kind: receiver.track.kind,
            enabled: receiver.track.enabled,
            readyState: receiver.track.readyState,
            muted: receiver.track.muted
          });
        }
      });
      
      // Set up periodic health check
      const healthCheck = setInterval(() => {
        console.log('🏥 Connection health check:', {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          senders: pc.getSenders().length,
          receivers: pc.getReceivers().length,
          hasRemoteStream: remoteAudioEl.srcObject !== null
        });
      }, 5000);
      
      // Store health check interval for cleanup
      if (!sessionTimer) sessionTimer = { healthCheck };
      else sessionTimer.healthCheck = healthCheck;

      onConnected && onConnected();

      // Optional max session duration (e.g., 2 minutes)
      if (maxDurationMs && typeof maxDurationMs === 'number') {
        if (!sessionTimer.timeout) {
          sessionTimer.timeout = setTimeout(() => {
            stop();
          }, maxDurationMs);
        }
      }
    } catch (e) {
      onError && onError(e);
      throw e;
    }
	};

  const stop = async () => {
    try {
      // Clear all timers
      if (sessionTimer) {
        if (sessionTimer.timeout) clearTimeout(sessionTimer.timeout);
        if (sessionTimer.healthCheck) clearInterval(sessionTimer.healthCheck);
        sessionTimer = null;
      }
      
      if (pc) {
        // Stop all tracks
        pc.getSenders().forEach((sender) => {
          try { 
            if (sender.track) {
              sender.track.stop();
              console.log('🛑 Stopped sender track:', sender.track.id);
            }
          } catch (e) {
            console.warn('⚠️ Error stopping sender track:', e);
          }
        });
        
        // Close peer connection
        pc.close();
        console.log('🛑 Closed peer connection');
      }
      
      if (micStream) {
        micStream.getTracks().forEach((t) => {
          t.stop();
          console.log('🛑 Stopped microphone track:', t.id);
        });
      }
    } finally {
      pc = null;
      micStream = null;
      if (remoteAudioEl) {
        try { 
          remoteAudioEl.srcObject = null;
          remoteAudioEl.pause();
          console.log('🛑 Stopped remote audio');
        } catch (e) {
          console.warn('⚠️ Error stopping remote audio:', e);
        }
      }
    }
  };

	// Optional: request a fresh Part 2 cue card on demand
	const requestCueCard = () => {
		if (!dataChannel || dataChannel.readyState !== 'open') {
			throw new Error('Data channel is not open');
		}
		const cueReq = {
			type: 'response.create',
			response: {
				instructions: 'Generate an IELTS Part 2 cue card with a random topic and 3-4 bullet prompts.',
				modalities: ['audio', 'text']
			}
		};
		dataChannel.send(JSON.stringify(cueReq));
	};

	// Mute/unmute the local microphone track so the user can stop transmitting
	// audio (e.g. while thinking). Server-side VAD will treat this as silence.
	const setMuted = (muted) => {
		if (!micStream) return;
		micStream.getAudioTracks().forEach((track) => {
			track.enabled = !muted;
		});
	};

	// Interrupt the AI mid-response (e.g. if it's rambling). Tells the server
	// to cancel the in-flight response so the user can speak again right away.
	const interrupt = () => {
		try {
			if (dataChannel && dataChannel.readyState === 'open') {
				dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
			}
			// Also stop any currently playing remote audio immediately
			if (remoteAudioEl) {
				try {
					remoteAudioEl.pause();
					remoteAudioEl.currentTime = 0;
				} catch {}
			}
		} catch (e) {
			console.warn('⚠️ Failed to interrupt realtime response:', e);
		}
	};

	// Expose the local mic stream so the UI can attach a WebAudio analyser
	// to it (volume meter, voice-activity indicator, etc).
	const getMicStream = () => micStream;

	// Expose the remote audio element so the UI can read .paused / .ended
	// for reliable "AI speaking" status.
	const getRemoteAudioEl = () => remoteAudioEl;

	return {
		start,
		stop,
		isSupported,
		requestCueCard,
		setMuted,
		interrupt,
		getMicStream,
		getRemoteAudioEl,
	};
}


