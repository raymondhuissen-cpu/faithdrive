const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { nodewhisper } = require('nodejs-whisper');
const { WHISPER_CPP_PATH, MODEL_OBJECT } = require('nodejs-whisper/dist/constants');

const MODEL_NAME = process.env.WHISPER_LOCAL_MODEL || 'small';
const USE_CUDA = process.env.WHISPER_USE_CUDA === 'true';
const MODEL_ROOT = path.join(__dirname, '..', 'data', 'models');

function isBinaryBuilt() {
  const execName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  const candidates = [
    path.join(WHISPER_CPP_PATH, 'build', 'bin', execName),
    path.join(WHISPER_CPP_PATH, 'build', 'bin', 'Release', execName),
  ];
  return candidates.some((p) => fs.existsSync(p));
}

function isModelDownloaded() {
  const modelFile = MODEL_OBJECT[MODEL_NAME];
  return Boolean(modelFile) && fs.existsSync(path.join(MODEL_ROOT, modelFile));
}

function getLocalEngineStatus() {
  const binaryBuilt = isBinaryBuilt();
  const modelDownloaded = isModelDownloaded();
  return {
    engine: 'local',
    model: MODEL_NAME,
    binaryBuilt,
    modelDownloaded,
    ready: binaryBuilt && modelDownloaded,
  };
}

const TIMESTAMP_LINE = /^\[[^\]]*\]\s*/;

function stripTimestamps(rawOutput) {
  return rawOutput
    .split('\n')
    .map((line) => line.replace(TIMESTAMP_LINE, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkFfmpegAvailable() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function doTranscribe(buffer, mimeType) {
  fs.mkdirSync(MODEL_ROOT, { recursive: true });
  const ext = mimeType && mimeType.includes('mp4') ? 'mp4' : 'webm';
  const tmpFile = path.join(os.tmpdir(), `var-notulen-${crypto.randomBytes(8).toString('hex')}.${ext}`);
  fs.writeFileSync(tmpFile, buffer);

  try {
    const raw = await nodewhisper(tmpFile, {
      modelName: MODEL_NAME,
      autoDownloadModelName: MODEL_NAME,
      modelRootPath: MODEL_ROOT,
      removeWavFileAfterTranscription: true,
      withCuda: USE_CUDA,
      logger: { log: () => {}, debug: () => {}, error: console.error, warn: console.warn },
      whisperOptions: {
        language: 'nl',
        splitOnWord: true,
        noGpu: !USE_CUDA,
      },
    });
    return stripTimestamps(raw);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// whisper.cpp draait CPU-zwaar; verwerk fragmenten na elkaar in plaats van
// gelijktijdig, zodat meerdere binnenkomende segmenten niet om geheugen/CPU vechten.
let queue = Promise.resolve();
function transcribeAudioLocally(buffer, mimeType) {
  const result = queue.then(
    () => doTranscribe(buffer, mimeType),
    () => doTranscribe(buffer, mimeType)
  );
  queue = result.then(
    () => {},
    () => {}
  );
  return result;
}

module.exports = { transcribeAudioLocally, checkFfmpegAvailable, getLocalEngineStatus, MODEL_NAME, MODEL_ROOT };
