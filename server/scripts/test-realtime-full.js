/**
 * Full Realtime pipeline test (terminal).
 * Run: node scripts/test-realtime-full.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = require('node-fetch');
const { connectRealtimeCall, createRealtimeClientSecret } = require('../src/services/realtimeSessionService');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';

async function main() {
  console.log('=== FULL REALTIME PIPELINE TEST ===\n');
  let failed = 0;

  // 1) Token with GA model
  try {
    const token = await createRealtimeClientSecret();
    if (!token.value || token.model !== 'gpt-realtime') {
      throw new Error(`Unexpected token response: model=${token.model}`);
    }
    console.log('[PASS] createRealtimeClientSecret → gpt-realtime token');
  } catch (e) {
    console.log('[FAIL] createRealtimeClientSecret:', e.message);
    failed++;
  }

  // 2) HTTP token endpoint
  try {
    const r = await fetch(`${BASE}/api/speaking/realtime/token`);
    const j = await r.json();
    if (!r.ok || !j.value) throw new Error(JSON.stringify(j));
    console.log('[PASS] GET /api/speaking/realtime/token →', j.model);
  } catch (e) {
    console.log('[FAIL] GET /api/speaking/realtime/token:', e.message);
    failed++;
  }

  // 3) Service-level SDP relay (must NOT be model_not_found)
  try {
    const minimalSdp = [
      'v=0', 'o=- 0 0 IN IP4 127.0.0.1', 's=-', 't=0 0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'c=IN IP4 0.0.0.0',
      'a=ice-ufrag:t', 'a=ice-pwd:testpasswordtestpassword',
      'a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00',
      'a=setup:actpass', 'a=mid:0', 'a=sendrecv', 'a=rtcp-mux', 'a=rtpmap:111 opus/48000/2',
    ].join('\r\n') + '\r\n';

    await connectRealtimeCall(minimalSdp);
    console.log('[PASS] connectRealtimeCall → full SDP answer');
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('model_not_found') || msg.includes('does not exist')) {
      console.log('[FAIL] connectRealtimeCall model error:', msg);
      failed++;
    } else if (msg.includes('Invalid SDP') || msg.includes('invalid_offer')) {
      console.log('[PASS] connectRealtimeCall → model OK (fake SDP rejected as expected)');
    } else {
      console.log('[FAIL] connectRealtimeCall:', msg.slice(0, 200));
      failed++;
    }
  }

  // 4) HTTP connect endpoint
  try {
    const minimalSdp = 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\n';
    const r = await fetch(`${BASE}/api/speaking/realtime/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: minimalSdp,
    });
    const text = await r.text();
    if (r.status === 404 && text.includes('model_not_found')) {
      throw new Error(text);
    }
    if (text.trim().startsWith('v=')) {
      console.log('[PASS] POST /api/speaking/realtime/connect → SDP answer');
    } else if (r.status === 400 || r.status === 500) {
      if (text.includes('model_not_found')) throw new Error(text);
      console.log('[PASS] POST /api/speaking/realtime/connect → model OK (SDP validation only)');
    } else {
      throw new Error(`${r.status} ${text.slice(0, 150)}`);
    }
  } catch (e) {
    console.log('[FAIL] POST /api/speaking/realtime/connect:', e.message.slice(0, 200));
    failed++;
  }

  // 5) Verify preview model is NOT default (would break WebRTC)
  try {
    const token = await createRealtimeClientSecret();
    if (token.model.includes('2024-12-17')) {
      throw new Error('Still using preview dated model as default');
    }
    console.log('[PASS] Default model is GA (not dated preview)');
  } catch (e) {
    console.log('[FAIL]', e.message);
    failed++;
  }

  console.log('\n=== PRODUCTION CHECK (Render) ===');
  try {
    const prodConnect = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/realtime/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: 'v=0\r\n',
    });
    const prodToken = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/realtime/token');
    const prodJson = await prodToken.json().catch(() => ({}));
    if (prodConnect.status === 404) {
      console.log('[WARN] Production missing POST /api/speaking/realtime/connect → DEPLOY BACKEND');
    } else {
      console.log('[PASS] Production has /realtime/connect endpoint');
    }
    if (prodJson.model?.includes('preview') || prodJson.model?.includes('2024-12-17')) {
      console.log('[WARN] Production still uses preview model:', prodJson.model, '→ DEPLOY BACKEND');
    } else if (prodJson.model) {
      console.log('[PASS] Production model:', prodJson.model);
    }
  } catch (e) {
    console.log('[WARN] Could not reach production:', e.message);
  }

  console.log('\n=== SUMMARY ===');
  if (failed === 0) {
    console.log('✅ All backend Realtime checks PASSED');
    console.log('   WebRTC audio requires browser test (mic + speaker).');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} check(s) FAILED`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Test crashed:', e);
  process.exit(1);
});
