const fetch = require('node-fetch');

const OPENAI_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

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

function buildSessionConfig(overrides = {}) {
  const session = {
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

  return { session };
}

async function createRealtimeClientSecret(overrides = {}) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY not configured');
    err.status = 500;
    throw err;
  }

  const payload = buildSessionConfig(overrides);
  const url = `${OPENAI_BASE}/v1/realtime/client_secrets`;

  console.log('➡️ Creating Realtime client secret:', url);
  console.log('➡️ Model:', payload.session.model);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body;
  const text = await response.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  console.log('⬅️ OpenAI client_secrets status:', response.status);
  if (!response.ok) {
    console.error('⬅️ OpenAI client_secrets body:', body);
    const err = new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(body)}`);
    err.status = response.status;
    err.openai = body;
    throw err;
  }

  const token = body?.value || body?.client_secret?.value;
  if (!token) {
    const err = new Error('No ephemeral token in OpenAI response');
    err.status = 502;
    err.openai = body;
    throw err;
  }

  return {
    value: token,
    expires_at: body.expires_at,
    client_secret: { value: token },
    model: body.session?.model || payload.session.model,
    id: body.session?.id || body.id || `realtime-${Date.now()}`,
    success: true,
  };
}

module.exports = {
  createRealtimeClientSecret,
  buildSessionConfig,
  REALTIME_MODEL,
  DEFAULT_INSTRUCTIONS,
  IELTS_EXAMINER_INSTRUCTIONS,
};
