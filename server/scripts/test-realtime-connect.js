require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { connectRealtimeCall } = require('../src/services/realtimeSessionService');

const MINIMAL_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'c=IN IP4 0.0.0.0',
  'a=rtcp:9 IN IP4 0.0.0.0',
  'a=ice-ufrag:test',
  'a=ice-pwd:testpasswordtestpassword',
  'a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
  'a=setup:actpass',
  'a=mid:0',
  'a=sendrecv',
  'a=rtcp-mux',
  'a=rtpmap:111 opus/48000/2',
].join('\r\n') + '\r\n';

(async () => {
  console.log('=== Test unified Realtime connect (server relay) ===\n');
  try {
    const result = await connectRealtimeCall(MINIMAL_SDP);
    console.log('Model used:', result.model);
    console.log('Got SDP answer:', result.answerSdp.trim().startsWith('v='));
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('Invalid SDP') || msg.includes('invalid_offer')) {
      console.log('PASS (model OK) — fake SDP rejected as expected:', msg.slice(0, 120));
      process.exit(0);
    }
    if (msg.includes('model_not_found') || msg.includes('does not exist')) {
      console.log('FAIL — model not found:', msg);
      process.exit(1);
    }
    console.log('Result:', msg.slice(0, 200));
    process.exit(msg.includes('Invalid SDP') || msg.includes('invalid_offer') ? 0 : 1);
  }
})();
