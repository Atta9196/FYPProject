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

      // 1) Get ephemeral token from server
      const resp = await fetch(`${import.meta.env.VITE_SERVER_URL || ''}/api/auth/realtime-token`);
      const session = await resp.json();
      if (!session || !session.client_secret) throw new Error('Failed to get realtime token');

      // 2) Create PeerConnection
      pc = new RTCPeerConnection({
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      });

      // 3) Attach remote audio track to element
      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        remoteStream.addTrack(event.track);
        remoteAudioEl.srcObject = remoteStream;
      };

      // 4) Capture microphone and add tracks
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      // 5) Create offer and wait for ICE gathering to complete for reliability
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

      // 6) Send SDP to OpenAI Realtime API
      const sdpResp = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.client_secret.value}`,
          'Content-Type': 'application/sdp'
        },
        body: pc.localDescription.sdp
      });

      if (!sdpResp.ok) throw new Error(`SDP exchange failed: ${sdpResp.status}`);

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      onConnected && onConnected();

      // Optional max session duration (e.g., 2 minutes)
      if (maxDurationMs && typeof maxDurationMs === 'number') {
        clearTimeout(sessionTimer);
        sessionTimer = setTimeout(() => {
          stop();
        }, maxDurationMs);
      }
    } catch (e) {
      onError && onError(e);
      throw e;
    }
  };

  const stop = async () => {
    try {
      if (sessionTimer) clearTimeout(sessionTimer);
      if (pc) {
        pc.getSenders().forEach((sender) => {
          try { sender.track && sender.track.stop(); } catch {}
        });
        pc.close();
      }
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
      }
    } finally {
      pc = null;
      micStream = null;
      if (remoteAudioEl) {
        try { remoteAudioEl.srcObject = null; } catch {}
      }
    }
  };

  return { start, stop, isSupported };
}


