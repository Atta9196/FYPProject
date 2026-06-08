const fetch = require('node-fetch');

const OPENAI_BASE = (process.env.OPENAI_API_BASE || 'https://api.openai.com').replace(/\/$/, '');
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';

const DEFAULT_INSTRUCTIONS =
  'You are a professional IELTS Speaking examiner conducting a natural, human-like conversation practice session.';

function buildSessionConfig(overrides = {}) {
  const session = {
    type: 'realtime',
    model: overrides.model || REALTIME_MODEL,
    instructions: overrides.instructions || DEFAULT_INSTRUCTIONS,
    audio: {
      output: { voice: overrides.voice || 'verse' },
    },
  };

  if (overrides.max_output_tokens != null) {
    session.max_output_tokens = overrides.max_output_tokens;
  } else if (overrides.max_response_output_tokens != null) {
    session.max_output_tokens = overrides.max_response_output_tokens;
  } else {
    session.max_output_tokens = 120;
  }

  return { session };
}

/**
 * Mint an ephemeral Realtime API token via POST /v1/realtime/client_secrets.
 * Returns a normalized payload compatible with existing client code.
 */
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
};
