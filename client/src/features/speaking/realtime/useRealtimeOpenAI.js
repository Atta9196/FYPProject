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

/** Exchange WebRTC SDP via server relay; fallback to ephemeral token if relay route missing. */
async function exchangeSdpWithServer(serverUrl, offerSdp) {
  const connectUrl = `${serverUrl}/api/speaking/realtime/connect`;
  const connectResp = await fetch(connectUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offerSdp,
  });

  const connectBody = await connectResp.text();

  if (connectResp.ok && connectBody.trim().startsWith('v=')) {
    console.log('✅ SDP exchange via server relay');
    return connectBody;
  }

  // Old backend without /connect — use token + direct OpenAI (gpt-realtime only)
  if (connectResp.status === 404) {
    console.log('🔄 /realtime/connect not found — token fallback');
    const tokenResp = await fetch(`${serverUrl}/api/speaking/realtime/token`);
    if (!tokenResp.ok) {
      throw new Error('Backend missing /realtime/connect and token fetch failed. Deploy latest server.');
    }
    const session = await tokenResp.json();
    const token = session.value || session.client_secret?.value;
    if (!token) throw new Error('No ephemeral token from server');

    if (session.model?.includes('2024-12-17') || session.model?.includes('preview')) {
      throw new Error(
        'Backend is outdated (preview Realtime model). Deploy the latest server with gpt-realtime and /api/speaking/realtime/connect.'
      );
    }

    const openaiResp = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
      body: offerSdp,
    });
    const answer = await openaiResp.text();
    if (!openaiResp.ok) {
      let msg = answer;
      try { msg = JSON.parse(answer).error?.message || answer; } catch {}
      throw new Error(`SDP exchange failed (${openaiResp.status}): ${msg}`);
    }
    if (!answer.trim().startsWith('v=')) throw new Error('OpenAI did not return valid SDP answer');
    console.log('✅ SDP exchange via token fallback, model:', session.model);
    return answer;
  }

  let errMsg = connectBody;
  try {
    const j = JSON.parse(connectBody);
    errMsg = j.message || j.error || connectBody;
  } catch {}
  throw new Error(`SDP exchange failed (${connectResp.status}): ${errMsg}`);
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

      console.log('🔗 Sending SDP offer to server for Realtime connect…');
      const answerText = await exchangeSdpWithServer(SERVER_URL, pc.localDescription.sdp);

      await pc.setRemoteDescription({ type: 'answer', sdp: answerText });
      console.log('✅ WebRTC SDP answer applied');

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
