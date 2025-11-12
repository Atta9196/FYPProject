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
        || 'http://localhost:5000';
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

			// Send session instructions to run a full IELTS Part 1/2/3 style conversation
			// Randomized, continuous, no static script, AI speaks first and throughout.
			try {
				if (!hasSentSessionInstructions) {
					const ieltsInstructions = `You are an experienced IELTS Speaking examiner conducting a full live practice session that follows official IELTS structure. Follow these strict rules:

OVERVIEW:
- Run three parts in order: Part 1 (intro/interview short Qs), Part 2 (cue card long turn), Part 3 (discussion). Move automatically between parts.
- Randomize wording and topics every session and every question; never repeat exact phrasings.
- Always produce both text and audio for examiner speech.

TIMINGS & BEHAVIOR:
- Part 1: 4-6 short questions, each 10-25 seconds max. Keep friendly tone.
- Part 2: Provide a cue card with topic + 3-4 bullet points. Say: "You have one minute to prepare — I will tell you when to start." Wait approx 60s before prompting the user to speak. Let the user speak for 1–2 minutes.
- Part 3: 4-6 deeper questions that explore opinions and abstract ideas related to Part 2 topic. Allow full answers and ask one follow-up per user answer.

CONVERSATION RULES:
- Always reference specifics user says. Example: "You said you work as a teacher — how does that influence...".
- Ask follow-up questions that require explanation and opinion.
- If user is silent or struggling, give a short encouragement like "Take your time — you can start whenever you're ready."
- Keep replies short (1–2 sentences) to mimic an examiner.
- Do not provide band scores during the conversation. Instead, provide brief inline constructive feedback after a user's response (e.g., "Good example — try varying your sentence openings to improve coherence").

FEEDBACK (background):
- Continuously evaluate user's speech for: fluency & coherence, lexical resource, grammatical range & accuracy, pronunciation.
- Emit structured feedback events for the client with approximate values (0-100) and short comments after each long turn or when asked.

EVENTS:
- Send streaming transcription events as they happen (partial & final).
- Send structured JSON events for:
  - part.change { part: 1|2|3 }
  - question.asked { text, part }
  - feedback.inline { pronunciation: x, fluency: x, lexical: x, grammar: x, comment: "..." }
  - cuecard.card { topic: "...", bullets: [...] }
  - session.summary at the end (optional)

PRIVACY:
- Do not ask for personal ID numbers or sensitive personal info.
- If user gives personal sensitive info, respond politely and avoid repeating it in logs.

Randomization: choose topics from everyday life, technology, culture, education, travel, work, environment, health, arts.`;

					// Prefer session.update so the instruction persists for the whole call
					const sessionUpdate = {
						type: 'session.update',
						session: {
							instructions: ieltsInstructions,
							// Ensure we get audio and text back
							modalities: ['audio', 'text'],
						},
					};

					dataChannel.send(JSON.stringify(sessionUpdate));

					// Immediately ask the first randomized Part 1 question (no local TTS)
					const startPartOne = {
						type: 'response.create',
						response: {
							instructions: 'Begin Part 1: greet briefly and ask a randomized warm-up question about personal background or daily life.',
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
          // Parse JSON event from OpenAI Realtime API
          const eventData = JSON.parse(event.data);
          console.log('📨 Realtime event from AI:', eventData);
          
          // Handle various transcription event types
          // OpenAI Realtime API sends different event types for transcription
          let transcript = null;
          let isPartial = false;
          let isComplete = false;
          
          // Check for transcript in various possible locations
          if (eventData.transcript) {
            transcript = eventData.transcript;
          } else if (eventData.delta && eventData.delta.transcript) {
            transcript = eventData.delta.transcript;
          } else if (eventData.item && eventData.item.input_audio_transcript) {
            transcript = eventData.item.input_audio_transcript;
          } else if (eventData.input_audio_transcript) {
            transcript = eventData.input_audio_transcript;
          }
          
          // Determine if this is a partial or complete transcription
          if (eventData.type === 'input_audio_buffer_committed') {
            isComplete = true;
            isPartial = false;
          } else if (eventData.type === 'input_audio_buffer_speech_started' || 
                     eventData.type === 'input_audio_buffer_speech_stopped') {
            isPartial = true;
            isComplete = false;
          } else if (eventData.type === 'conversation_item_input_audio_transcription_completed' ||
                     eventData.type === 'conversation_item_input_audio_transcription_failed') {
            isComplete = true;
            isPartial = false;
				} else if (eventData.type === 'response.audio_transcript.delta' ||
							eventData.type === 'response.audio_transcript.done') {
            // These are for AI responses, not user input
            return;
          }
          
          // If we found a transcript, call the callback
          if (transcript && onTranscriptionUpdate) {
            console.log('📝 Real-time transcription:', transcript, { isPartial, isComplete });
            onTranscriptionUpdate({
              transcript: transcript,
              isPartial: isPartial,
              isComplete: isComplete,
              eventType: eventData.type
            });
          }

				// Stream AI text responses to UI (for showing current question and tracking parts)
				try {
					// Delta updates for AI response
					if (onAgentMessage && (eventData.type === 'response.delta' || eventData.type === 'response.output_text.delta')) {
						let textDelta = '';
						// Try common shapes
						if (eventData.delta && typeof eventData.delta === 'string') {
							textDelta = eventData.delta;
						} else if (eventData.delta && eventData.delta.content) {
							// If content is an array of text chunks
							const parts = Array.isArray(eventData.delta.content) ? eventData.delta.content : [eventData.delta.content];
							textDelta = parts.map(p => (p && p.text) ? p.text : '').join('');
						} else if (eventData.output_text_delta) {
							textDelta = eventData.output_text_delta;
						}
						if (textDelta) {
							onAgentMessage({ type: 'delta', text: textDelta });
						}
					}

					// Completed AI response
					if (onAgentMessage && (eventData.type === 'response.completed' || eventData.type === 'response.done' || eventData.type === 'response.output_text.done')) {
						let finalText = '';
						if (eventData.response && typeof eventData.response.output_text === 'string') {
							finalText = eventData.response.output_text;
						} else if (typeof eventData.output_text === 'string') {
							finalText = eventData.output_text;
						}
						onAgentMessage({ type: 'done', text: finalText });
					}
				} catch (msgErr) {
					console.warn('⚠️ Failed to surface AI message to UI:', msgErr);
				}

				// Structured events that the model may send
				try {
					if (eventData.type === 'part.change' && onAgentMessage) {
						onAgentMessage({ type: 'part', text: null, meta: { part: eventData.part } });
					}
					if (eventData.type === 'question.asked' && onAgentMessage) {
						onAgentMessage({ type: 'question', text: eventData.text, meta: { part: eventData.part } });
					}
					if (eventData.type === 'feedback.inline' && onFeedback) {
						onFeedback(eventData.feedback);
						onAgentMessage && onAgentMessage({ type: 'feedback', text: null, meta: eventData.feedback });
					}
					if (eventData.type === 'cuecard.card' && onAgentMessage) {
						onAgentMessage({ type: 'question', text: eventData.topic, meta: { part: 2, bullets: eventData.bullets } });
					}
				} catch (e) {
					console.warn('⚠️ Failed to surface structured event:', e);
				}
			} catch (parseError) {
          // If not JSON, log as plain text
          console.log('📨 Realtime message from AI (text):', event.data);
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

	return { start, stop, isSupported, requestCueCard };
}


