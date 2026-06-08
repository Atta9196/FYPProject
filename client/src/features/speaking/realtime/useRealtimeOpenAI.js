// OpenAI Realtime API — WebRTC client for live two-way voice (IELTS speaking)

function resolveServerUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.DEV) return '';
  }
  if (typeof window !== 'undefined' && window.__SERVER_URL__) return window.__SERVER_URL__;
  return 'https://ielts-coach-backend.onrender.com';
}

function extractToken(session) {
  if (!session) return null;
  if (typeof session.value === 'string') return session.value;
  if (typeof session.client_secret === 'string') return session.client_secret;
  if (session.client_secret?.value) return session.client_secret.value;
  if (session.data?.client_secret?.value) return session.data.client_secret.value;
  return null;
}

function playRemoteAudio(el) {
  if (!el) return;
  el.muted = false;
  el.volume = 1;
  el.playsInline = true;
  el.autoplay = true;
  const p = el.play();
  if (p && typeof p.then === 'function') {
    p.then(() => console.log('✅ AI audio playing')).catch((err) => {
      console.warn('⚠️ Autoplay blocked — click anywhere to hear AI:', err.message);
    });
  }
}

export function createRealtimeAgent() {
  let pc = null;
  let micStream = null;
  let remoteAudioEl = null;
  let sessionTimer = null;
  let dataChannel = null;
  let greetingSent = false;
  let sessionConfigured = false;

  const isSupported = () => typeof RTCPeerConnection !== 'undefined';

  const sendGreeting = () => {
    if (greetingSent || !dataChannel || dataChannel.readyState !== 'open') return;
    greetingSent = true;
    console.log('🗣️ Requesting AI opening greeting…');
    dataChannel.send(JSON.stringify({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
        instructions:
          'Speak out loud NOW with your voice. Say exactly: "Good day. My name is Alex and I\'ll be your examiner today. Could you please tell me your full name?" Nothing else.',
      },
    }));
  };

  const handleRealtimeEvent = (eventData, callbacks) => {
    const { onTranscriptionUpdate, onAgentMessage, onFeedback, onAiSpeakingChange } = callbacks;
    const t = eventData.type || '';

    if (t !== 'response.output_audio.delta' && t !== 'response.output_audio_transcript.delta' &&
        t !== 'response.audio.delta' && t !== 'response.audio_transcript.delta') {
      console.log('📨 Realtime event:', t);
    }

    // Session ready → AI speaks first
    if (t === 'session.created') {
      sessionConfigured = true;
      sendGreeting();
      return;
    }
    if (t === 'session.updated') {
      if (!greetingSent) sendGreeting();
      return;
    }

    // AI is speaking (audio buffer lifecycle)
    if (t === 'output_audio_buffer.started') {
      onAiSpeakingChange?.(true);
      playRemoteAudio(remoteAudioEl);
      return;
    }
    if (t === 'output_audio_buffer.stopped' || t === 'output_audio_buffer.cleared') {
      onAiSpeakingChange?.(false);
      return;
    }

    // AI transcript (GA + legacy event names)
    const isTranscriptDelta =
      t === 'response.output_audio_transcript.delta' || t === 'response.audio_transcript.delta';
    const isTranscriptDone =
      t === 'response.output_audio_transcript.done' || t === 'response.audio_transcript.done';

    if (isTranscriptDelta && onAgentMessage) {
      const textDelta = typeof eventData.delta === 'string' ? eventData.delta : '';
      if (textDelta) {
        onAiSpeakingChange?.(true);
        onAgentMessage({ type: 'delta', text: textDelta });
      }
      return;
    }
    if (isTranscriptDone && onAgentMessage) {
      const finalText = typeof eventData.transcript === 'string' ? eventData.transcript : '';
      onAgentMessage({ type: 'done', text: finalText });
      onAiSpeakingChange?.(false);
      return;
    }

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
    if ((t === 'response.completed' || t === 'response.done') && onAgentMessage) {
      onAgentMessage({ type: 'done', text: '' });
      onAiSpeakingChange?.(false);
      return;
    }

    // User speech (server VAD + transcription)
    if (t === 'input_audio_buffer.speech_started' && onTranscriptionUpdate) {
      onTranscriptionUpdate({ transcript: '', isPartial: true, isComplete: false, eventType: t, speechStarted: true });
      return;
    }
    if (t === 'input_audio_buffer.speech_stopped' && onTranscriptionUpdate) {
      onTranscriptionUpdate({ transcript: '', isPartial: true, isComplete: false, eventType: t, speechStopped: true });
      return;
    }
    if (t === 'conversation.item.input_audio_transcription.delta' && onTranscriptionUpdate) {
      const textDelta = typeof eventData.delta === 'string' ? eventData.delta : '';
      if (textDelta) {
        onTranscriptionUpdate({ transcript: textDelta, isPartial: true, isComplete: false, eventType: t, isDelta: true });
      }
      return;
    }
    if (t === 'conversation.item.input_audio_transcription.completed' && onTranscriptionUpdate) {
      onTranscriptionUpdate({
        transcript: typeof eventData.transcript === 'string' ? eventData.transcript : '',
        isPartial: false,
        isComplete: true,
        eventType: t,
      });
      return;
    }
    if (t === 'conversation.item.input_audio_transcription.failed') {
      console.warn('⚠️ Transcription failed:', eventData);
      onTranscriptionUpdate?.({
        transcript: '', isPartial: false, isComplete: true, eventType: t, failed: true,
        error: eventData.error?.message || 'Transcription failed',
      });
      return;
    }
    if (t === 'conversation.item.created' && onTranscriptionUpdate) {
      const item = eventData.item || {};
      if (item.role === 'user' && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (part && typeof part.transcript === 'string' && part.transcript.trim()) {
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
    if (t === 'input_audio_buffer.committed') {
      console.log('🎤 User audio committed for transcription');
      return;
    }

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
      onAgentMessage?.({ type: 'feedback', text: null, meta: eventData.feedback });
      return;
    }
    if (t === 'error') {
      console.error('❌ Realtime API error:', eventData?.error || eventData);
    }
  };

  const start = async ({
    audioEl,
    onConnected,
    onError,
    maxDurationMs,
    onTranscriptionUpdate,
    onAgentMessage,
    onFeedback,
    onAiSpeakingChange,
  } = {}) => {
    try {
      if (!isSupported()) throw new Error('WebRTC not supported');

      greetingSent = false;
      sessionConfigured = false;
      remoteAudioEl = audioEl || new Audio();
      playRemoteAudio(remoteAudioEl);

      const SERVER_URL = resolveServerUrl();
      let resp;

      for (const [label, url, opts] of [
        ['token', `${SERVER_URL}/api/speaking/realtime/token`, { method: 'GET', headers: { 'Content-Type': 'application/json' } }],
        ['voice', `${SERVER_URL}/api/voice/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }],
        ['auth', `${SERVER_URL}/api/auth/realtime-token`, { method: 'GET' }],
      ]) {
        resp = await fetch(url, opts);
        if (resp.ok) {
          console.log(`✅ Realtime token from ${label}`);
          break;
        }
        console.log(`🔄 ${label} failed (${resp.status}), trying next…`);
      }

      if (!resp?.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `Token fetch failed (${resp?.status})`);
      }

      const session = await resp.json();
      const clientSecretValue = extractToken(session);
      if (!clientSecretValue) throw new Error('No ephemeral token in server response');

      console.log('✅ Ephemeral token received, model:', session.model);

      pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });

      const eventCallbacks = { onTranscriptionUpdate, onAgentMessage, onFeedback, onAiSpeakingChange };

      dataChannel = pc.createDataChannel('oai-events');
      dataChannel.onopen = () => console.log('✅ Realtime data channel open');
      dataChannel.onmessage = (event) => {
        try {
          handleRealtimeEvent(JSON.parse(event.data), eventCallbacks);
        } catch {
          console.log('📨 Realtime raw message:', event.data);
        }
      };

      pc.ontrack = (event) => {
        console.log('🎵 AI audio track received');
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        remoteAudioEl.srcObject = stream;
        playRemoteAudio(remoteAudioEl);
      };

      pc.onconnectionstatechange = () => {
        console.log('🔌 WebRTC state:', pc.connectionState);
      };

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));
      console.log('✅ Microphone attached');

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const done = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', done);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', done);
        setTimeout(resolve, 2000);
      });

      const sdpResp = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecretValue}`,
          'Content-Type': 'application/sdp',
        },
        body: pc.localDescription.sdp,
      });

      if (!sdpResp.ok) {
        const errText = await sdpResp.text().catch(() => '');
        throw new Error(`SDP exchange failed (${sdpResp.status}): ${errText}`);
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpResp.text() });
      console.log('✅ SDP exchange complete');

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebRTC connection timeout')), 15000);
        const check = () => {
          if (pc.connectionState === 'connected') {
            clearTimeout(timeout);
            pc.removeEventListener('connectionstatechange', check);
            resolve();
          } else if (pc.connectionState === 'failed') {
            clearTimeout(timeout);
            reject(new Error('WebRTC connection failed'));
          }
        };
        if (pc.connectionState === 'connected') {
          clearTimeout(timeout);
          resolve();
        } else {
          pc.addEventListener('connectionstatechange', check);
        }
      });

      // Fallback: if session.created event was missed, greet after connect
      setTimeout(() => {
        if (!greetingSent) {
          console.log('⏰ Greeting fallback — sending response.create');
          sendGreeting();
        }
      }, 2500);

      onConnected?.();

      if (maxDurationMs && typeof maxDurationMs === 'number') {
        sessionTimer = setTimeout(() => stop(), maxDurationMs);
      }
    } catch (e) {
      onError?.(e);
      throw e;
    }
  };

  const stop = async () => {
    try {
      if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
      }
      pc?.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} });
      pc?.close();
      micStream?.getTracks().forEach((t) => t.stop());
    } finally {
      pc = null;
      micStream = null;
      dataChannel = null;
      greetingSent = false;
      sessionConfigured = false;
      if (remoteAudioEl) {
        try {
          remoteAudioEl.pause();
          remoteAudioEl.srcObject = null;
        } catch {}
      }
    }
  };

  const requestCueCard = () => {
    if (!dataChannel || dataChannel.readyState !== 'open') throw new Error('Not connected');
    dataChannel.send(JSON.stringify({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
        instructions: 'Give an IELTS Part 2 cue card with a Describe topic and 3 bullet prompts. Speak it out loud.',
      },
    }));
  };

  const setMuted = (muted) => {
    micStream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  };

  const interrupt = () => {
    if (dataChannel?.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'response.cancel' }));
      dataChannel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }));
    }
    if (remoteAudioEl) {
      try { remoteAudioEl.pause(); remoteAudioEl.currentTime = 0; } catch {}
    }
  };

  return {
    start,
    stop,
    isSupported,
    requestCueCard,
    setMuted,
    interrupt,
    getMicStream: () => micStream,
    getRemoteAudioEl: () => remoteAudioEl,
  };
}
