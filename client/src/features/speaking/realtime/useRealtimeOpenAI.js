// Minimal WebRTC client for OpenAI Realtime API
// Browser: fetch ephemeral token from server, then connect via WebRTC

export function createRealtimeAgent() {
  let pc = null;
  let micStream = null;
  let remoteAudioEl = null;
  let sessionTimer = null;
  let dataChannel = null;
  let hasSentSessionInstructions = false;
  let audioContext = null;
  let audioProcessor = null;
  let isCapturingAudio = false;

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
      remoteAudioEl.volume = 1.0;
      remoteAudioEl.muted = false;
      
      // Set up audio element event handlers immediately
      remoteAudioEl.onplay = () => {
        console.log('▶️ AI audio started playing');
        audioPlayAttempted = true;
      };
      
      remoteAudioEl.onpause = () => {
        console.log('⏸️ AI audio paused');
      };
      
      remoteAudioEl.onended = () => {
        console.log('⏹️ AI audio ended');
        audioPlayAttempted = false;
      };
      
      remoteAudioEl.onerror = (e) => {
        console.error('❌ Audio element error:', e);
        audioPlayAttempted = false;
      };
      
      remoteAudioEl.onloadedmetadata = () => {
        console.log('📊 Audio metadata loaded');
      };
      
      remoteAudioEl.oncanplay = () => {
        console.log('✅ Audio can play - attempting playback');
        attemptAudioPlay();
      };
      
      remoteAudioEl.oncanplaythrough = () => {
        console.log('✅ Audio can play through - attempting playback');
        attemptAudioPlay();
      };

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
        console.error('❌ Error details:', {
          message: e.message,
          stack: e.stack,
          response: e.response
        });
        
        // Provide more helpful error message
        let errorMessage = `Failed to get realtime token: ${e.message}`;
        if (e.message && e.message.includes('401')) {
          errorMessage += '\n\nPossible issues:\n';
          errorMessage += '1. API key may not have Realtime API access\n';
          errorMessage += '2. Check API key permissions in OpenAI dashboard\n';
          errorMessage += '3. Realtime API may require special access - contact OpenAI support';
        } else if (e.message && e.message.includes('403')) {
          errorMessage += '\n\nYour API key may not have permission to access Realtime API.';
        }
        
        throw new Error(errorMessage);
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
      try {
        dataChannel = pc.createDataChannel('oai-events', {
          ordered: true // Ensure messages arrive in order
        });
        console.log('✅ Data channel created');
      } catch (dcError) {
        console.error('❌ Failed to create data channel:', dcError);
        throw new Error(`Failed to create data channel: ${dcError.message}`);
      }
      
		// Define startSendingAudio function before dataChannel.onopen
		const startSendingAudio = () => {
			if (!dataChannel || dataChannel.readyState !== 'open') {
				console.warn('⚠️ Data channel not open, cannot start sending audio');
				return;
			}
			
			if (isCapturingAudio) {
				console.log('⚠️ Already capturing audio');
				return;
			}
			
			try {
				// Send input_audio_buffer.start event
				dataChannel.send(JSON.stringify({
					type: 'input_audio_buffer.start'
				}));
				
				isCapturingAudio = true;
				console.log('✅ Started sending audio to OpenAI via data channel');
			} catch (e) {
				console.error('❌ Error starting audio capture:', e);
			}
		};
		
		dataChannel.onopen = () => {
        console.log('✅ Data channel opened for text messages');
        console.log('📡 Data channel ready state:', dataChannel.readyState);

			// Send session instructions to run a full IELTS Part 1/2/3 style conversation
			// Randomized, continuous, no static script, AI speaks first and throughout.
			try {
				if (!hasSentSessionInstructions && dataChannel.readyState === 'open') {
					const ieltsInstructions = `You are an experienced IELTS Speaking examiner conducting a full live practice session that follows official IELTS structure. Follow these strict rules:

OVERVIEW:
- Run three parts in order: Part 1 (intro/interview short Qs), Part 2 (cue card long turn), Part 3 (discussion). Move automatically between parts.
- Randomize wording and topics every session and every question; never repeat exact phrasings.
- Always produce both text and audio for examiner speech.

TIMINGS & BEHAVIOR:
- Part 1: 4-6 short questions, each 10-25 seconds max. Keep friendly tone.
- Part 2: Provide a cue card with topic + 3-4 bullet points. Say: "You have one minute to prepare — I will tell you when to start." Wait approx 60s before prompting the user to speak. Let the user speak for 1–2 minutes.
- Part 3: 4-6 deeper questions that explore opinions and abstract ideas related to Part 2 topic. Allow full answers and ask one follow-up per user answer.

CONVERSATION RULES - CRITICAL:
- LISTEN ACTIVELY: Always wait for the user to finish speaking completely before responding.
- PROCESS FULL RESPONSES: Read and understand the user's complete answer before asking the next question.
- REFERENCE USER CONTENT: Always reference specific things the user said. Example: "You said you work as a teacher — how does that influence...".
- ASK FOLLOW-UPS: Ask follow-up questions that require explanation and opinion based on what they actually said.
- BE PATIENT: If user is silent or struggling, give a short encouragement like "Take your time — you can start whenever you're ready."
- KEEP REPLIES SHORT: Keep replies short (1–2 sentences) to mimic an examiner.
- NO BAND SCORES: Do not provide band scores during the conversation. Instead, provide brief inline constructive feedback after a user's response (e.g., "Good example — try varying your sentence openings to improve coherence").

TURN-TAKING RULES - CRITICAL:
- WAIT FOR USER TO FINISH: Never interrupt the user while they are speaking.
- LISTEN COMPLETELY: Process the user's entire response before formulating your reply.
- ONE QUESTION AT A TIME: Ask ONE question at a time, then wait for the user's complete answer.
- NATURAL FLOW: This is a conversation, not a rapid-fire interview. Allow natural pauses and thinking time.

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
							// Configure turn detection for better listening
							turn_detection: {
								type: 'server_vad',
								threshold: 0.5,
								prefix_padding_ms: 300,
								silence_duration_ms: 4000 // Increased to 4 seconds to wait for user to finish speaking
							}
						},
					};

					dataChannel.send(JSON.stringify(sessionUpdate));
					console.log('✅ Sent session update with turn detection settings');

					// Wait a moment before starting to ensure session is updated
					setTimeout(() => {
						// Immediately ask the first randomized Part 1 question (no local TTS)
						const startPartOne = {
							type: 'response.create',
							response: {
								instructions: 'Begin Part 1: greet briefly and ask a randomized warm-up question about personal background or daily life.',
								modalities: ['audio', 'text'],
							},
						};

						dataChannel.send(JSON.stringify(startPartOne));
						console.log('✅ Sent Part 1 start request');
					}, 500);

					hasSentSessionInstructions = true;
					console.log('✅ Sent IELTS session instructions and started Part 1');
					
					// Start sending audio to OpenAI now that everything is set up
					setTimeout(() => {
						startSendingAudio();
					}, 1000); // Wait 1 second for session to be ready
				}
			} catch (e) {
				console.warn('⚠️ Failed to send session instructions:', e);
			}
      };
      dataChannel.onclose = () => {
        console.log('⚠️ Data channel closed');
        if (onError) {
          onError(new Error('Data channel closed unexpectedly. Connection may be lost.'));
        }
      };
      
      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
        if (onError) {
          onError(new Error(`Data channel error: ${error.message || 'Unknown error'}`));
        }
      };
      
      dataChannel.onmessage = (event) => {
        try {
          // Parse JSON event from OpenAI Realtime API
          const eventData = JSON.parse(event.data);
          console.log('📨 Realtime event from AI:', eventData.type, eventData);
          
          // Handle various transcription event types
          // OpenAI Realtime API sends different event types for transcription
          let transcript = null;
          let isPartial = false;
          let isComplete = false;
          
          // Handle INPUT audio transcription events (user speaking)
          // Check for transcript in various possible locations based on OpenAI Realtime API format
          if (eventData.type === 'input_audio_transcription.delta') {
            // Partial transcription as user speaks
            transcript = eventData.delta?.transcript || eventData.transcript || eventData.delta;
            isPartial = true;
            isComplete = false;
            console.log('📝 Partial user transcription:', transcript);
          } else if (eventData.type === 'input_audio_transcription.completed') {
            // Complete transcription
            transcript = eventData.transcript || eventData.transcript_text || eventData.delta?.transcript;
            isPartial = false;
            isComplete = true;
            console.log('✅ Complete user transcription:', transcript);
          } else if (eventData.type === 'input_audio_buffer.speech_started') {
            // User started speaking
            console.log('🎤 User started speaking');
            if (onTranscriptionUpdate) {
              onTranscriptionUpdate({
                transcript: '',
                isPartial: true,
                isComplete: false,
                eventType: eventData.type
              });
            }
          } else if (eventData.type === 'input_audio_buffer.speech_stopped') {
            // User stopped speaking
            console.log('🔇 User stopped speaking');
          } else if (eventData.type === 'input_audio_buffer.committed') {
            // Audio buffer committed - transcription should follow
            console.log('💾 Audio buffer committed, waiting for transcription...');
          } else if (eventData.transcript) {
            // Fallback: check if transcript exists in event
            transcript = eventData.transcript;
            isPartial = false;
            isComplete = true;
          } else if (eventData.delta && eventData.delta.transcript) {
            transcript = eventData.delta.transcript;
            isPartial = true;
            isComplete = false;
          } else if (eventData.item && eventData.item.input_audio_transcript) {
            transcript = eventData.item.input_audio_transcript;
            isPartial = false;
            isComplete = true;
          } else if (eventData.input_audio_transcript) {
            transcript = eventData.input_audio_transcript;
            isPartial = false;
            isComplete = true;
          } else if (eventData.transcript_text) {
            transcript = eventData.transcript_text;
            isPartial = false;
            isComplete = true;
          }
          
          // Skip AI response events for user transcription
          if (eventData.type === 'response.audio_transcript.delta' ||
              eventData.type === 'response.audio_transcript.done' ||
              eventData.type?.startsWith('response.')) {
            // These are for AI responses, not user input - skip transcription handling
            // But continue to handle response text below
          } else if (transcript && onTranscriptionUpdate) {
            // If we found a transcript, call the callback
            console.log('📝 Real-time transcription update:', { transcript, isPartial, isComplete, type: eventData.type });
            onTranscriptionUpdate({
              transcript: transcript,
              isPartial: isPartial,
              isComplete: isComplete,
              eventType: eventData.type
            });
          }

				// Handle OUTPUT (AI response) text and audio transcript events
				try {
					// Delta updates for AI response TEXT
					if (onAgentMessage && (
						eventData.type === 'response.delta' || 
						eventData.type === 'response.output_text.delta' ||
						eventData.type === 'response.text.delta'
					)) {
						let textDelta = '';
						// Try common shapes
						if (eventData.delta && typeof eventData.delta === 'string') {
							textDelta = eventData.delta;
						} else if (eventData.delta && eventData.delta.text) {
							textDelta = eventData.delta.text;
						} else if (eventData.delta && eventData.delta.content) {
							// If content is an array of text chunks
							const parts = Array.isArray(eventData.delta.content) ? eventData.delta.content : [eventData.delta.content];
							textDelta = parts.map(p => (p && p.text) ? p.text : (typeof p === 'string' ? p : '')).join('');
						} else if (eventData.output_text_delta) {
							textDelta = eventData.output_text_delta;
						} else if (eventData.text_delta) {
							textDelta = eventData.text_delta;
						}
						if (textDelta) {
							console.log('📝 AI text delta:', textDelta);
							onAgentMessage({ type: 'delta', text: textDelta });
						}
					}

					// Delta updates for AI response AUDIO TRANSCRIPT (what AI is saying)
					if (onAgentMessage && eventData.type === 'response.audio_transcript.delta') {
						let audioTranscript = '';
						if (eventData.delta && eventData.delta.transcript) {
							audioTranscript = eventData.delta.transcript;
						} else if (eventData.transcript) {
							audioTranscript = eventData.transcript;
						}
						if (audioTranscript) {
							console.log('🎤 AI audio transcript delta:', audioTranscript);
							onAgentMessage({ type: 'delta', text: audioTranscript });
						}
					}

					// Completed AI response TEXT
					if (onAgentMessage && (
						eventData.type === 'response.completed' || 
						eventData.type === 'response.done' || 
						eventData.type === 'response.output_text.done' ||
						eventData.type === 'response.text.done'
					)) {
						let finalText = '';
						if (eventData.response && typeof eventData.response.output_text === 'string') {
							finalText = eventData.response.output_text;
						} else if (eventData.response && typeof eventData.response.text === 'string') {
							finalText = eventData.response.text;
						} else if (typeof eventData.output_text === 'string') {
							finalText = eventData.output_text;
						} else if (typeof eventData.text === 'string') {
							finalText = eventData.text;
						}
						if (finalText) {
							console.log('✅ AI response completed:', finalText.substring(0, 100));
							onAgentMessage({ type: 'done', text: finalText });
						}
						
						// Ensure audio is playing when response completes
						setTimeout(() => {
							if (remoteAudioEl && remoteAudioEl.paused && remoteStream.getAudioTracks().length > 0) {
								console.log('🔄 Response completed but audio paused - attempting to resume');
								attemptAudioPlay();
							}
						}, 100);
					}

					// Completed AI response AUDIO TRANSCRIPT
					if (onAgentMessage && eventData.type === 'response.audio_transcript.done') {
						let finalTranscript = '';
						if (eventData.transcript) {
							finalTranscript = eventData.transcript;
						} else if (eventData.response && eventData.response.audio_transcript) {
							finalTranscript = eventData.response.audio_transcript;
						}
						if (finalTranscript) {
							console.log('✅ AI audio transcript done:', finalTranscript.substring(0, 100));
							onAgentMessage({ type: 'done', text: finalTranscript });
						}
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
      // Note: onerror handler is already set above, removing duplicate

      // 4) Attach remote audio track to element for AI voice playback
      const remoteStream = new MediaStream();
      let audioPlayAttempted = false;
      
      pc.ontrack = (event) => {
        console.log('🎵 Received remote audio track from AI');
        console.log('📊 Track details:', {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          streams: event.streams.length,
          muted: event.track.muted
        });
        
        // Only add audio tracks
        if (event.track.kind === 'audio') {
          // Check if track is already in stream to avoid duplicates
          const existingTracks = remoteStream.getAudioTracks();
          const trackExists = existingTracks.some(t => t.id === event.track.id);
          
          if (!trackExists) {
            remoteStream.addTrack(event.track);
            console.log('✅ Added audio track to remote stream');
          } else {
            console.log('⚠️ Track already exists in stream, skipping');
          }
          
          // Ensure track is enabled and not muted
          event.track.enabled = true;
          if (event.track.muted) {
            console.warn('⚠️ Track is muted, attempting to unmute...');
            // Try to unmute if possible
            event.track.muted = false;
          }
          
          // Update audio element source immediately
          if (remoteAudioEl.srcObject !== remoteStream) {
            remoteAudioEl.srcObject = remoteStream;
            console.log('✅ Updated audio element source to remote stream');
          }
          
          // Monitor track state changes
          event.track.onended = () => {
            console.log('⚠️ Remote audio track ended');
            audioPlayAttempted = false; // Reset to allow replay
          };
          
          event.track.onmute = () => {
            console.warn('⚠️ Remote audio track muted');
            // Try to unmute
            if (event.track.muted) {
              event.track.muted = false;
            }
          };
          
          event.track.onunmute = () => {
            console.log('✅ Remote audio track unmuted');
            attemptAudioPlay();
          };
          
          // Monitor track state changes
          event.track.onstatechange = () => {
            console.log('📊 Track state changed:', event.track.readyState, 'muted:', event.track.muted);
            if (event.track.readyState === 'live' && !event.track.muted) {
              console.log('✅ Track is live and unmuted - attempting playback');
              attemptAudioPlay();
            }
          };
          
          // Attempt to play audio immediately if track is live
          if (event.track.readyState === 'live' && !event.track.muted) {
            console.log('🎵 Track is live - attempting immediate playback');
            attemptAudioPlay();
          } else {
            console.log('⏳ Track not ready yet, waiting for state change...', {
              readyState: event.track.readyState,
              muted: event.track.muted
            });
          }
        }
      };
      
      // Helper function to attempt audio playback with retries
      const attemptAudioPlay = async () => {
        // Don't block if already playing successfully
        if (audioPlayAttempted && remoteAudioEl.srcObject && !remoteAudioEl.paused && remoteAudioEl.currentTime > 0) {
          console.log('✅ Audio already playing, skipping');
          return;
        }
        
        try {
          // Ensure we have a valid stream
          if (!remoteAudioEl.srcObject || !remoteStream.getAudioTracks().length) {
            console.log('⏳ Waiting for audio stream...', {
              hasSrcObject: !!remoteAudioEl.srcObject,
              trackCount: remoteStream.getAudioTracks().length
            });
            return;
          }
          
          // Check if any tracks are live and unmuted
          const audioTracks = remoteStream.getAudioTracks();
          const hasLiveTrack = audioTracks.some(track => track.readyState === 'live' && !track.muted);
          
          if (!hasLiveTrack) {
            console.log('⏳ Waiting for live audio track...', {
              tracks: audioTracks.map(t => ({
                readyState: t.readyState,
                muted: t.muted,
                enabled: t.enabled
              }))
            });
            return;
          }
          
          // Ensure audio element is properly configured
          remoteAudioEl.volume = 1.0;
          remoteAudioEl.muted = false;
          
          // Ensure srcObject is set
          if (remoteAudioEl.srcObject !== remoteStream) {
            remoteAudioEl.srcObject = remoteStream;
            console.log('✅ Set audio element srcObject');
          }
          
          // Wait a bit for the stream to be ready (but don't wait too long)
          if (remoteAudioEl.readyState < 2) {
            await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                console.log('⏱️ Timeout waiting for audio ready state, attempting play anyway');
                resolve();
              }, 1000); // Reduced to 1 second for faster response
              
              const checkReady = () => {
                if (remoteAudioEl.readyState >= 2) {
                  clearTimeout(timeout);
                  remoteAudioEl.removeEventListener('canplay', checkReady);
                  remoteAudioEl.removeEventListener('canplaythrough', checkReady);
                  console.log('✅ Audio ready state reached');
                  resolve();
                }
              };
              remoteAudioEl.addEventListener('canplay', checkReady);
              remoteAudioEl.addEventListener('canplaythrough', checkReady);
              
              // Also check immediately
              if (remoteAudioEl.readyState >= 2) {
                clearTimeout(timeout);
                resolve();
              }
            });
          }
          
          // Try to play
          console.log('🎵 Attempting to play audio...', {
            readyState: remoteAudioEl.readyState,
            paused: remoteAudioEl.paused,
            muted: remoteAudioEl.muted,
            volume: remoteAudioEl.volume,
            hasSrcObject: !!remoteAudioEl.srcObject
          });
          
          const playPromise = remoteAudioEl.play();
          
          if (playPromise !== undefined) {
            await playPromise;
            audioPlayAttempted = true;
            console.log('✅ AI audio started playing successfully');
          }
        } catch (error) {
          console.warn('⚠️ Autoplay prevented or error:', error.name, error.message);
          audioPlayAttempted = false;
          
          // Set up click handler to play on user interaction
          const playOnInteraction = () => {
            console.log('👆 User interaction detected, attempting to play audio...');
            remoteAudioEl.play()
              .then(() => {
                console.log('✅ AI audio started playing after user interaction');
                audioPlayAttempted = true;
              })
              .catch(e => console.error('❌ Failed to play audio after interaction:', e));
          };
          
          // Try multiple event types for better compatibility
          ['click', 'touchstart', 'keydown', 'mousedown'].forEach(eventType => {
            document.addEventListener(eventType, playOnInteraction, { once: true, passive: true });
          });
          
          // Also try on audio element directly
          if (remoteAudioEl) {
            remoteAudioEl.addEventListener('click', playOnInteraction, { once: true });
            remoteAudioEl.addEventListener('touchstart', playOnInteraction, { once: true });
          }
          
          // Show user a message that they need to interact
          console.warn('⚠️ Browser autoplay policy blocked audio. User interaction required to start playback.');
        }
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
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        }
        
        micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1 // Mono for better compatibility
          } 
        });
        console.log('✅ Microphone access granted for Realtime API');
        
        // Set up audio capture and send to OpenAI via data channel
        // This must be inside start() to access dataChannel and isCapturingAudio
        try {
          audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 44100
          });
          
          const source = audioContext.createMediaStreamSource(micStream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (event) => {
            if (!isCapturingAudio || !dataChannel || dataChannel.readyState !== 'open') {
              return;
            }
            
            const inputData = event.inputBuffer.getChannelData(0);
            // Convert Float32Array to Int16Array (PCM format)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // Clamp and convert to 16-bit integer
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            // Send audio chunk to OpenAI via data channel as binary data
            try {
              dataChannel.send(pcmData.buffer);
            } catch (e) {
              console.warn('⚠️ Error sending audio chunk:', e);
            }
          };
          
          source.connect(processor);
          processor.connect(audioContext.destination);
          audioProcessor = processor;
          
          console.log('✅ Audio capture pipeline set up - ready to send audio chunks');
        } catch (e) {
          console.error('❌ Error setting up audio capture:', e);
        }
        
        const audioTracks = micStream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('No audio tracks found in microphone stream');
        }
        
        console.log(`📊 Found ${audioTracks.length} audio track(s)`);
        
        audioTracks.forEach((track, index) => {
          console.log(`🎤 Adding microphone track ${index + 1}:`, {
            id: track.id,
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            label: track.label,
            muted: track.muted,
            settings: track.getSettings()
          });
          
          // Add track to peer connection
          const sender = pc.addTrack(track, micStream);
          
          // Verify sender was created
          if (sender) {
            console.log(`✅ Microphone track ${index + 1} added successfully, sender ID:`, sender.track?.id);
            
            // Ensure track is enabled and not muted
            if (sender.track) {
              sender.track.enabled = true;
              console.log(`✅ Microphone track ${index + 1} enabled:`, sender.track.enabled);
              
              // Monitor track state
              sender.track.addEventListener('ended', () => {
                console.warn(`⚠️ Microphone track ${index + 1} ended`);
              });
              sender.track.addEventListener('mute', () => {
                console.warn(`⚠️ Microphone track ${index + 1} muted`);
              });
              sender.track.addEventListener('unmute', () => {
                console.log(`✅ Microphone track ${index + 1} unmuted`);
              });
            }
          } else {
            console.warn(`⚠️ Failed to create sender for track ${index + 1}`);
          }
        });
        
        // Verify tracks were added to peer connection
        const senders = pc.getSenders();
        console.log(`📤 Total senders in peer connection: ${senders.length}`);
        senders.forEach((sender, index) => {
          if (sender.track) {
            console.log(`  Sender ${index + 1}:`, {
              kind: sender.track.kind,
              id: sender.track.id,
              enabled: sender.track.enabled,
              readyState: sender.track.readyState
            });
          }
        });
        
        // Monitor track state
        micStream.getTracks().forEach((track, index) => {
          track.onended = () => {
            console.log(`⚠️ Microphone track ${index + 1} ended`);
            if (onError) {
              onError(new Error('Microphone track ended unexpectedly. Please check your microphone connection.'));
            }
          };
          track.onmute = () => {
            console.warn(`⚠️ Microphone track ${index + 1} muted`);
          };
          track.onunmute = () => {
            console.log(`✅ Microphone track ${index + 1} unmuted`);
          };
          track.onerror = (error) => {
            console.error(`❌ Microphone track ${index + 1} error:`, error);
            if (onError) {
              onError(new Error('Microphone track error occurred. Please check your microphone.'));
            }
          };
          
          // Log track state changes
          track.addEventListener('ended', () => console.log(`📊 Track ${index + 1} ended event`));
          track.addEventListener('mute', () => console.log(`📊 Track ${index + 1} mute event`));
          track.addEventListener('unmute', () => console.log(`📊 Track ${index + 1} unmute event`));
        });
        
        console.log('✅ Microphone setup complete - audio capture pipeline ready');
        
        // Start sending audio to OpenAI once data channel is open
        // This will be called from dataChannel.onopen handler
      } catch (micError) {
        console.error('❌ Microphone access failed for Realtime API:', micError);
        
        // Provide more helpful error messages
        let errorMessage = 'Microphone access failed';
        if (micError.name === 'NotAllowedError' || micError.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings and try again.';
        } else if (micError.name === 'NotFoundError' || micError.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (micError.name === 'NotReadableError' || micError.name === 'TrackStartError') {
          errorMessage = 'Microphone is being used by another application. Please close other applications using the microphone and try again.';
        } else if (micError.name === 'OverconstrainedError' || micError.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Microphone settings could not be satisfied. Please try a different microphone or check your system settings.';
        } else {
          errorMessage = `Microphone error: ${micError.message || micError.name}. Please check your microphone and try again.`;
        }
        
        // Clean up and re-throw
        if (pc) {
          try {
            pc.close();
          } catch (closeError) {
            console.error('Error closing peer connection:', closeError);
          }
          pc = null;
        }
        
        throw new Error(errorMessage);
      }

      // 6) Create offer and wait for ICE gathering to complete for reliability
      try {
        const offer = await pc.createOffer({ 
          offerToReceiveAudio: true, 
          offerToReceiveVideo: false 
        });
        await pc.setLocalDescription(offer);
        console.log('✅ Created WebRTC offer');
        
        // Wait for ICE gathering with timeout
        await new Promise((resolve, reject) => {
          if (pc.iceGatheringState === 'complete') {
            console.log('✅ ICE gathering already complete');
            return resolve();
          }
          
          const timeout = setTimeout(() => {
            console.warn('⚠️ ICE gathering timeout, proceeding anyway');
            pc.removeEventListener('icegatheringstatechange', check);
            resolve(); // Don't fail, just proceed
          }, 3000); // 3 second timeout
          
          const check = () => {
            console.log('🧊 ICE gathering state:', pc.iceGatheringState);
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              pc.removeEventListener('icegatheringstatechange', check);
              console.log('✅ ICE gathering complete');
              resolve();
            } else if (pc.iceGatheringState === 'closed') {
              clearTimeout(timeout);
              pc.removeEventListener('icegatheringstatechange', check);
              reject(new Error('ICE gathering closed unexpectedly'));
            }
          };
          
          pc.addEventListener('icegatheringstatechange', check);
        });
      } catch (offerError) {
        console.error('❌ Failed to create WebRTC offer:', offerError);
        throw new Error(`Failed to create WebRTC connection: ${offerError.message}`);
      }

      // 7) Send SDP to OpenAI Realtime API
      // Use the correct endpoint format: https://api.openai.com/v1/realtime?model=...
      // Get the model from session (should match what backend used)
      const model = session.model || 'gpt-4o-realtime-preview-2024-12-17';
      const realtimeEndpoint = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
      
      console.log('🔑 Using client_secret token (first 20 chars):', clientSecretValue.substring(0, 20) + '...');
      console.log('📋 SDP offer length:', pc.localDescription.sdp.length);
      console.log('🔗 Connecting to OpenAI Realtime API:', realtimeEndpoint);
      console.log('🤖 Using model:', model);
      
      // Validate SDP before sending
      if (!pc.localDescription || !pc.localDescription.sdp) {
        throw new Error('Local SDP description not available. WebRTC setup failed.');
      }
      
      let sdpResp;
      try {
        sdpResp = await fetch(realtimeEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${clientSecretValue}`,
            'Content-Type': 'application/sdp'
          },
          body: pc.localDescription.sdp
        });
      } catch (fetchError) {
        console.error('❌ Network error during SDP exchange:', fetchError);
        throw new Error(`Network error connecting to OpenAI Realtime API: ${fetchError.message}. Please check your internet connection.`);
      }

      if (!sdpResp.ok) {
        const errorText = await sdpResp.text().catch(() => 'Unknown error');
        console.error('❌ SDP exchange failed:', sdpResp.status, errorText);
        console.error('📋 Response headers:', Object.fromEntries(sdpResp.headers.entries()));
        console.error('🔑 Client secret used (first 20 chars):', clientSecretValue.substring(0, 20) + '...');
        console.error('🔑 Client secret length:', clientSecretValue.length);
        
        // Provide more helpful error messages
        let errorMessage = `SDP exchange failed: ${sdpResp.status}`;
        if (sdpResp.status === 401) {
          errorMessage += ' - Authentication failed. The session token may be invalid or expired. Please try creating a new session.';
        } else if (sdpResp.status === 403) {
          errorMessage += ' - Access forbidden. Please check your API key permissions and ensure it has access to the Realtime API.';
        } else if (sdpResp.status === 429) {
          errorMessage += ' - Rate limit exceeded. Please try again in a moment.';
        } else if (sdpResp.status >= 500) {
          errorMessage += ' - OpenAI server error. Please try again later.';
        } else {
          errorMessage += ` - ${errorText.substring(0, 200)}`;
        }
        throw new Error(errorMessage);
      }
      
      const answerSdp = await sdpResp.text();
      
      if (!answerSdp || answerSdp.trim().length === 0) {
        throw new Error('Empty SDP answer received from OpenAI. Please try again.');
      }
      
      try {
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        console.log('✅ SDP exchange succeeded');
      } catch (sdpError) {
        console.error('❌ Failed to set remote SDP description:', sdpError);
        throw new Error(`Failed to process SDP answer: ${sdpError.message}. Please try again.`);
      }
      
      // Wait for connection to be established with better error handling
      await new Promise((resolve, reject) => {
        const CONNECTION_TIMEOUT = 15000; // Increased to 15 seconds
        let timeoutCleared = false;
        
        // Helper to start audio once connected
        const startAudioOnConnect = () => {
          if (pc.connectionState === 'connected' && remoteStream.getAudioTracks().length > 0) {
            console.log('🔊 Connection established, attempting to start audio playback');
            setTimeout(() => attemptAudioPlay(), 500);
          }
        };
        
        const timeout = setTimeout(() => {
          if (!timeoutCleared) {
            timeoutCleared = true;
            console.error('⏱️ Connection timeout - WebRTC did not connect within 15 seconds');
            console.error('📊 Current connection state:', pc.connectionState);
            console.error('📊 ICE connection state:', pc.iceConnectionState);
            console.error('📊 ICE gathering state:', pc.iceGatheringState);
            
            // Check if we have any ICE candidates
            const stats = pc.getStats();
            stats.then(result => {
              console.error('📊 WebRTC stats:', Array.from(result.keys()));
            }).catch(e => console.error('Failed to get stats:', e));
            
            pc.removeEventListener('connectionstatechange', checkConnection);
            pc.removeEventListener('iceconnectionstatechange', checkIceConnection);
            reject(new Error(`Connection timeout - WebRTC did not connect within ${CONNECTION_TIMEOUT/1000} seconds. Please check your internet connection and try again.`));
          }
        }, CONNECTION_TIMEOUT);
        
        const checkConnection = () => {
          console.log('📊 Connection state changed:', pc.connectionState);
          console.log('📊 ICE connection state:', pc.iceConnectionState);
          
          if (pc.connectionState === 'connected') {
            if (!timeoutCleared) {
              timeoutCleared = true;
              clearTimeout(timeout);
              pc.removeEventListener('connectionstatechange', checkConnection);
              pc.removeEventListener('iceconnectionstatechange', checkIceConnection);
              console.log('✅ WebRTC connection fully established');
              console.log('📊 Final connection state:', pc.connectionState);
              console.log('📊 Final ICE connection state:', pc.iceConnectionState);
              
              // Try to start audio playback once connected
              setTimeout(() => {
                startAudioOnConnect();
              }, 500);
              
              resolve();
            }
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            if (!timeoutCleared) {
              timeoutCleared = true;
              clearTimeout(timeout);
              pc.removeEventListener('connectionstatechange', checkConnection);
              pc.removeEventListener('iceconnectionstatechange', checkIceConnection);
              console.error('❌ WebRTC connection failed:', pc.connectionState);
              console.error('📊 ICE connection state:', pc.iceConnectionState);
              reject(new Error(`WebRTC connection failed: ${pc.connectionState}. This may be due to network issues or firewall restrictions. Please try again.`));
            }
          }
        };
        
        const checkIceConnection = () => {
          console.log('🧊 ICE connection state changed:', pc.iceConnectionState);
          
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            // ICE is connected, but wait for full connection state
            if (pc.connectionState === 'connected' && !timeoutCleared) {
              timeoutCleared = true;
              clearTimeout(timeout);
              pc.removeEventListener('connectionstatechange', checkConnection);
              pc.removeEventListener('iceconnectionstatechange', checkIceConnection);
              console.log('✅ WebRTC connection established via ICE');
              
              // Try to start audio playback once connected
              setTimeout(() => {
                startAudioOnConnect();
              }, 500);
              
              resolve();
            }
          } else if (pc.iceConnectionState === 'failed') {
            if (!timeoutCleared) {
              timeoutCleared = true;
              clearTimeout(timeout);
              pc.removeEventListener('connectionstatechange', checkConnection);
              pc.removeEventListener('iceconnectionstatechange', checkIceConnection);
              console.error('❌ ICE connection failed');
              reject(new Error('ICE connection failed. This may be due to network issues, firewall restrictions, or NAT traversal problems. Please check your network connection and try again.'));
            }
          }
        };
        
        // Log initial state
        console.log('📊 Initial connection state:', pc.connectionState);
        console.log('📊 Initial ICE connection state:', pc.iceConnectionState);
        console.log('📊 Initial ICE gathering state:', pc.iceGatheringState);
        
        // Check if already connected
        if (pc.connectionState === 'connected') {
          timeoutCleared = true;
          clearTimeout(timeout);
          console.log('✅ WebRTC already connected');
          resolve();
        } else {
          // Listen to both events for better reliability
          pc.addEventListener('connectionstatechange', checkConnection);
          pc.addEventListener('iceconnectionstatechange', checkIceConnection);
        }
      });

        // Verify audio tracks are active
      console.log('📊 Checking audio tracks...');
      const senders = pc.getSenders();
      const receivers = pc.getReceivers();
      
      console.log('📤 Audio senders (microphone):', senders.length);
      let hasActiveMicrophone = false;
      senders.forEach((sender, i) => {
        if (sender.track) {
          const trackInfo = {
            kind: sender.track.kind,
            enabled: sender.track.enabled,
            readyState: sender.track.readyState,
            muted: sender.track.muted,
            id: sender.track.id
          };
          console.log(`  Sender ${i}:`, trackInfo);
          
          if (sender.track.kind === 'audio' && sender.track.enabled && !sender.track.muted && sender.track.readyState === 'live') {
            hasActiveMicrophone = true;
          }
          
          // Monitor track state changes
          sender.track.onended = () => {
            console.warn(`⚠️ Microphone track ${i} ended unexpectedly`);
          };
          sender.track.onmute = () => {
            console.warn(`⚠️ Microphone track ${i} muted`);
          };
          sender.track.onunmute = () => {
            console.log(`✅ Microphone track ${i} unmuted`);
          };
        }
      });
      
      if (!hasActiveMicrophone) {
        console.error('❌ WARNING: No active microphone track found! Audio may not be transmitting.');
      } else {
        console.log('✅ Active microphone track confirmed - audio should be transmitting');
      }
      
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
            console.log('⏱️ Max session duration reached, stopping...');
            stop();
          }, maxDurationMs);
        }
      }
    } catch (e) {
      console.error('❌ Realtime agent start failed:', e);
      
      // Clean up on error
      try {
        if (pc) {
          pc.close();
          pc = null;
        }
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
          micStream = null;
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      // Call error handler if provided
      if (onError) {
        onError(e);
      }
      
      // Re-throw with improved error message
      const errorMessage = e.message || 'Unknown error occurred while starting realtime agent';
      throw new Error(errorMessage);
    }
	};

  // Stop sending audio (commit buffer) - can be called manually if needed
  const stopSendingAudio = () => {
    if (!isCapturingAudio || !dataChannel || dataChannel.readyState !== 'open') {
      return;
    }
    
    try {
      // Send input_audio_buffer.commit event
      dataChannel.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      
      isCapturingAudio = false;
      console.log('✅ Committed audio buffer to OpenAI');
    } catch (e) {
      console.error('❌ Error committing audio buffer:', e);
    }
  };

  const stop = async () => {
    try {
      // Stop audio capture
      stopSendingAudio();
      
      // Clean up audio processing
      if (audioProcessor) {
        try {
          audioProcessor.disconnect();
          audioProcessor = null;
        } catch (e) {
          console.warn('⚠️ Error disconnecting audio processor:', e);
        }
      }
      
      if (audioContext) {
        try {
          await audioContext.close();
          audioContext = null;
        } catch (e) {
          console.warn('⚠️ Error closing audio context:', e);
        }
      }
      
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
      isCapturingAudio = false;
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


