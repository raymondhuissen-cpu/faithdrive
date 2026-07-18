// Compileert whisper.cpp en downloadt het lokale model vooraf, zodat dit niet
// tijdens een echte VAR-vergadering hoeft te gebeuren (dat kan de eerste keer
// enkele minuten duren). Draai dit na `npm install` met: npm run warmup

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const os = require('os');
const { nodewhisper } = require('nodejs-whisper');
const { checkFfmpegAvailable, MODEL_NAME, MODEL_ROOT } = require('../lib/localWhisper');

function writeSilentWav(filePath, seconds = 1, sampleRate = 16000) {
  const numSamples = seconds * sampleRate;
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // resterende bytes blijven 0 (stilte)

  fs.writeFileSync(filePath, buffer);
}

async function main() {
  console.log(`[Warmup] Model: ${MODEL_NAME}`);
  console.log(`[Warmup] Modelmap: ${MODEL_ROOT}`);

  if (!checkFfmpegAvailable()) {
    console.warn(
      '[Warmup] Waarschuwing: ffmpeg is niet gevonden op dit systeem. ' +
        'De lokale transcriptie-engine heeft ffmpeg nodig om opgenomen audio om te zetten. ' +
        'Installeer het met "winget install ffmpeg" (Windows), "sudo apt install ffmpeg" (Linux) ' +
        'of "brew install ffmpeg" (macOS).'
    );
  }

  const wavPath = path.join(os.tmpdir(), 'var-notulen-warmup.wav');
  writeSilentWav(wavPath);

  console.log('[Warmup] Bezig met compileren van whisper.cpp en downloaden van het model…');
  console.log('[Warmup] Dit kan een paar minuten duren, alleen bij de allereerste keer.');
  const start = Date.now();

  try {
    await nodewhisper(wavPath, {
      modelName: MODEL_NAME,
      autoDownloadModelName: MODEL_NAME,
      modelRootPath: MODEL_ROOT,
      removeWavFileAfterTranscription: true,
      whisperOptions: { language: 'nl' },
    });
    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[Warmup] Klaar in ${seconds}s. De lokale transcriptie-engine is nu klaar voor gebruik.`);
  } catch (err) {
    console.error('[Warmup] Mislukt:', err.message);
    console.error(
      '[Warmup] Controleer of build-essential/cmake (Linux/macOS) of MinGW-w64 (Windows) geïnstalleerd zijn, ' +
        'en of dit systeem internettoegang heeft om het model te downloaden.'
    );
    process.exitCode = 1;
  } finally {
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
  }
}

main();
