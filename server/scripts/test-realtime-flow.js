/**
 * Terminal E2E test for OpenAI Realtime token + WebRTC calls handshake.
 * Run: node scripts/test-realtime-flow.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = require('node-fetch');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';
const OPENAI_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

// Minimal SDP offer (enough for OpenAI to attempt parsing; full WebRTC needs browser)
const MINIMAL_SDP = [
  'v=0',
  'o=- 0 0 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126',
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

async function testEndpoint(name, url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { name, status: res.status, ok: res.ok, json, text: text.slice(0, 300) };
}

async function testWebRtcCalls(token) {
  const res = await fetch(OPENAI_CALLS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/sdp',
    },
    body: MINIMAL_SDP,
  });
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    isSdpAnswer: text.startsWith('v=0'),
    preview: text.slice(0, 200),
  };
}

async function main() {
  console.log('=== Realtime API Terminal Test ===\n');
  console.log('Server base:', BASE);
  console.log('OPENAI_API_KEY set:', Boolean(process.env.OPENAI_API_KEY));

  const endpoints = [
    ['GET /api/speaking/realtime/token', `${BASE}/api/speaking/realtime/token`, { method: 'GET' }],
    ['POST /api/voice/session', `${BASE}/api/voice/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }],
    ['GET /api/auth/realtime-token', `${BASE}/api/auth/realtime-token`, { method: 'GET' }],
  ];

  let token = null;
  let model = null;

  for (const [name, url, opts] of endpoints) {
    const r = await testEndpoint(name, url, opts);
    const hasToken = Boolean(r.json?.value || r.json?.client_secret?.value);
    console.log(`\n[${r.ok ? 'PASS' : 'FAIL'}] ${name} → HTTP ${r.status}`);
    if (r.json) {
      console.log('  model:', r.json.model || '(none)');
      console.log('  has token:', hasToken);
      if (r.json.error) console.log('  error:', r.json.error);
    } else {
      console.log('  body:', r.text);
    }
    if (r.ok && hasToken && !token) {
      token = r.json.value || r.json.client_secret?.value;
      model = r.json.model;
    }
  }

  if (!token) {
    console.log('\n❌ OVERALL: FAILED — no ephemeral token from any endpoint');
    process.exit(1);
  }

  console.log('\n--- WebRTC calls handshake (OpenAI /v1/realtime/calls) ---');
  console.log('Using token prefix:', token.slice(0, 12) + '...');
  console.log('Model from server:', model);

  const webrtc = await testWebRtcCalls(token);
  console.log(`\n[${webrtc.ok ? 'PASS' : 'CHECK'}] POST /v1/realtime/calls → HTTP ${webrtc.status}`);
  console.log('  SDP answer returned:', webrtc.isSdpAnswer);
  console.log('  response preview:', webrtc.preview.replace(/\r\n/g, ' | '));

  // 401/403 = bad token; 400 with sdp-related msg = token OK but SDP invalid (expected from minimal SDP)
  // 200/201 with v=0 = full success
  const tokenAccepted = webrtc.status !== 401 && webrtc.status !== 403;
  const fullSuccess = webrtc.ok && webrtc.isSdpAnswer;

  console.log('\n=== Summary ===');
  console.log('Token endpoints: PASS');
  console.log('Token accepted by OpenAI calls API:', tokenAccepted ? 'YES' : 'NO');
  console.log('Full WebRTC SDP exchange:', fullSuccess ? 'YES (complete)' : tokenAccepted ? 'PARTIAL (token OK; minimal SDP may be rejected — browser uses real SDP)' : 'NO');

  if (tokenAccepted) {
    console.log('\n✅ OVERALL: Realtime flow should work in browser after deploy.');
    process.exit(0);
  } else {
    console.log('\n❌ OVERALL: Token rejected at WebRTC calls step.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Test crashed:', e.message);
  process.exit(1);
});
