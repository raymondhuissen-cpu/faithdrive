const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

async function transcribeAudio(buffer, filename, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ontbreekt op de server');
  }

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), filename || 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('language', 'nl');
  form.append('response_format', 'json');

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Whisper API fout (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

module.exports = { transcribeAudio };
