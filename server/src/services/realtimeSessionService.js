const fetch = require('node-fetch');

const OPENAI_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');

// GA models work with POST /v1/realtime/calls; dated preview IDs often fail on WebRTC.
const REALTIME_MODEL_CANDIDATES = (
  process.env.OPENAI_REALTIME_MODEL
    ? [process.env.OPENAI_REALTIME_MODEL]
    : ['gpt-realtime', 'gpt-4o-realtime-preview', 'gpt-4o-realtime-preview-2024-12-17']
);

const REALTIME_MODEL = REALTIME_MODEL_CANDIDATES[0];

const IELTS_EXAMINER_INSTRUCTIONS = `You are Alex, a calm professional IELTS Speaking examiner on a live voice call with a candidate.

RULES FOR REAL-TIME CONVERSATION:
- Speak out loud with your voice on every turn. Never stay silent when it is your turn.
- Keep each reply to ONE short sentence (10-20 words). Ask ONE question at a time.
- Listen to the candidate, then respond directly to what they said.
- If the candidate interrupts you, stop immediately and listen.
- Do not teach, correct, or give scores during the test.

FLOW (in order):
1) Greet: "Good day. My name is Alex and I'll be your examiner today. Could you please tell me your full name?"
2) Part 1: Ask about hometown, work/study, then 2-3 familiar topics (hobbies, food, travel). Short questions only.
3) Part 2: Give one "Describe..." cue card, allow ~1 minute prep, then let them speak up to 2 minutes.
4) Part 3: 5-7 abstract discussion questions linked to the Part 2 topic.
5) Close: "Thank you. That is the end of the speaking test."`;

const DEFAULT_INSTRUCTIONS = IELTS_EXAMINER_INSTRUCTIONS;

function buildSessionObject(overrides = {}) {
  return {
    type: 'realtime',
    model: overrides.model || REALTIME_MODEL,
    instructions: overrides.instructions || DEFAULT_INSTRUCTIONS,
    output_modalities: ['audio'],
    audio: {
      input: {
        transcription: overrides.transcription || { model: 'whisper-1' },
        turn_detection: overrides.turn_detection || {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: { voice: overrides.voice || 'verse' },
    },
    max_output_tokens:
      overrides.max_output_tokens ??
      overrides.max_response_output_tokens ??
      150,
  };
}

function buildSessionConfig(overrides = {}) {
  return { session: buildSessionObject(overrides) };
}

/**
 * Server-relayed WebRTC SDP exchange.
 * Mints an ephemeral token (gpt-realtime) then forwards the browser SDP offer to OpenAI.
 */
async function connectRealtimeCall(sdpOffer, overrides = {}) {
  if (!sdpOffer || typeof sdpOffer !== 'string' || !sdpOffer.trim().startsWith('v=')) {
    const err = new Error('Invalid SDP offer');
    err.status = 400;
    throw err;
  }

  const models = overrides.model ? [overrides.model] : REALTIME_MODEL_CANDIDATES;
  let lastError = null;

  for (const model of models) {
    try {
      const tokenPayload = await createRealtimeClientSecret({ ...overrides, model });
      const url = `${OPENAI_BASE}/v1/realtime/calls`;

      console.log('➡️ Realtime WebRTC relay:', url, 'model:', tokenPayload.model);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenPayload.value}`,
          'Content-Type': 'application/sdp',
        },
        body: sdpOffer,
      });

      const answerSdp = await response.text();

      if (response.ok && answerSdp.trim().startsWith('v=')) {
        console.log('✅ Realtime WebRTC answer received, model:', tokenPayload.model);
        return { answerSdp, model: tokenPayload.model, sessionId: tokenPayload.id };
      }

      let parsed;
      try {
        parsed = JSON.parse(answerSdp);
      } catch {
        parsed = { message: answerSdp };
      }

      const code = parsed?.error?.code || '';
      const message = parsed?.error?.message || answerSdp;
      console.warn(`⚠️ Realtime relay failed (${model}):`, response.status, message);

      lastError = new Error(`OpenAI Realtime connect failed (${response.status}): ${message}`);
      lastError.status = response.status;
      lastError.openai = parsed;
      lastError.model = model;

      if (response.status === 404 && (code === 'model_not_found' || message.includes('does not exist'))) {
        continue;
      }
      throw lastError;
    } catch (e) {
      if (e.status === 404 || e.message?.includes('does not exist')) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error('No Realtime model available for this API key');
}

/** @deprecated Use connectRealtimeCall — kept for legacy clients */
async function createRealtimeClientSecret(overrides = {}) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY not configured');
    err.status = 500;
    throw err;
  }

  const models = overrides.model ? [overrides.model] : REALTIME_MODEL_CANDIDATES;
  let lastError = null;

  for (const model of models) {
    const payload = buildSessionConfig({ ...overrides, model });
    const url = `${OPENAI_BASE}/v1/realtime/client_secrets`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (response.ok) {
      const token = body?.value || body?.client_secret?.value;
      if (!token) break;
      return {
        value: token,
        expires_at: body.expires_at,
        client_secret: { value: token },
        model: body.session?.model || model,
        id: body.session?.id || `realtime-${Date.now()}`,
        success: true,
      };
    }

    lastError = new Error(`OpenAI API error: ${response.status} - ${text}`);
    lastError.status = response.status;
    lastError.openai = body;

    if (response.status === 404) continue;
    throw lastError;
  }

  throw lastError || new Error('Failed to create Realtime token');
}

module.exports = {
  connectRealtimeCall,
  createRealtimeClientSecret,
  buildSessionConfig,
  buildSessionObject,
  REALTIME_MODEL,
  REALTIME_MODEL_CANDIDATES,
  DEFAULT_INSTRUCTIONS,
  IELTS_EXAMINER_INSTRUCTIONS,
};
