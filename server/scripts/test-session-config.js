require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fetch = require('node-fetch');

const payload = {
  session: {
    type: 'realtime',
    model: 'gpt-4o-realtime-preview-2024-12-17',
    instructions: 'You are an IELTS examiner. Greet the candidate and ask their name.',
    output_modalities: ['audio'],
    max_output_tokens: 120,
    audio: {
      input: {
        transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: { voice: 'verse' },
    },
  },
};

fetch('https://api.openai.com/v1/realtime/client_secrets', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then((r) => r.text())
  .then((t) => console.log(t.slice(0, 600)))
  .catch(console.error);
