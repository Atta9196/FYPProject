// Minimal WebRTC client for OpenAI Realtime API
// Browser: fetch ephemeral token from server, then connect via WebRTC

export function createRealtimeAgent() {
  let pc = null;
  let micStream = null;
  let remoteAudioEl = null;
  let sessionTimer = null;

  const isSupported = () => typeof RTCPeerConnection !== 'undefined';

  const start = async ({ audioEl, onConnected, onError, maxDurationMs } = {}) => {
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
        // Direct client_secret
        clientSecretValue = typeof session.client_secret === 'string' 
          ? session.client_secret 
          : session.client_secret?.value || session.client_secret;
      } else if (session.data?.client_secret) {
        // Nested in data object
        clientSecretValue = typeof session.data.client_secret === 'string'
          ? session.data.client_secret
          : session.data.client_secret?.value || session.data.client_secret;
      }
      
      if (!clientSecretValue) {
        console.error('❌ client_secret not found in session:', {
          hasClientSecret: !!session.client_secret,
          hasData: !!session.data,
          sessionKeys: Object.keys(session)
        });
        throw new Error('client_secret not found in session response. Check server logs for details.');
      }
      
      console.log('✅ client_secret found:', clientSecretValue.substring(0, 20) + '...');
      
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
      const dataChannel = pc.createDataChannel('oai-events');
      dataChannel.onopen = () => {
        console.log('✅ Data channel opened for text messages');
      };
      dataChannel.onmessage = (event) => {
        console.log('📨 Realtime message from AI:', event.data);
        // Handle text messages from AI if needed
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
      // Try with session ID first, then fallback to generic endpoint
      const sessionId = session.id || session.session_id;
      let realtimeEndpoint;
      
      if (sessionId) {
        // Use session-specific endpoint if we have session ID
        realtimeEndpoint = `https://api.openai.com/v1/realtime/sessions/${sessionId}/stream`;
        console.log('🔗 Connecting to OpenAI Realtime API with session ID:', realtimeEndpoint);
      } else {
        // Fallback to generic endpoint
        realtimeEndpoint = 'https://api.openai.com/v1/realtime/sessions/stream';
        console.log('🔗 Connecting to OpenAI Realtime API (generic endpoint):', realtimeEndpoint);
      }
      
      console.log('🔑 Using client_secret token (first 20 chars):', clientSecretValue.substring(0, 20) + '...');
      console.log('📋 SDP offer length:', pc.localDescription.sdp.length);
      
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
        
        // Try alternative endpoint if first one failed
        if (sessionId && realtimeEndpoint.includes(sessionId)) {
          console.log('🔄 Retrying with generic endpoint...');
          const fallbackEndpoint = 'https://api.openai.com/v1/realtime/sessions/stream';
          const fallbackResp = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${clientSecretValue}`,
              'Content-Type': 'application/sdp'
            },
            body: pc.localDescription.sdp
          });
          
          if (!fallbackResp.ok) {
            const fallbackError = await fallbackResp.text().catch(() => 'Unknown error');
            throw new Error(`SDP exchange failed on both endpoints. Last error: ${fallbackResp.status} - ${fallbackError}`);
          }
          
          const answerSdp = await fallbackResp.text();
          await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
          console.log('✅ SDP exchange succeeded with fallback endpoint');
        } else {
          throw new Error(`SDP exchange failed: ${sdpResp.status} - ${errorText}`);
        }
      } else {
        const answerSdp = await sdpResp.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        console.log('✅ SDP exchange succeeded');
      }
      
      // Wait for connection to be established
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - WebRTC did not connect within 10 seconds'));
        }, 10000);
        
        const checkConnection = () => {
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            pc.removeEventListener('connectionstatechange', checkConnection);
            console.log('✅ WebRTC connection fully established');
            resolve();
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            clearTimeout(timeout);
            pc.removeEventListener('connectionstatechange', checkConnection);
            reject(new Error(`WebRTC connection failed: ${pc.connectionState}`));
          }
        };
        
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

  return { start, stop, isSupported };
}


