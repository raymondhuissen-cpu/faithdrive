const SEGMENT_MS = 2 * 60 * 1000; // splits opname elke 2 minuten voor tussentijdse transcriptie

const params = new URLSearchParams(window.location.search);
const meetingId = params.get('id');

const indicator = document.getElementById('indicator');
const timerEl = document.getElementById('timer');
const recStatus = document.getElementById('recStatus');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptWrap = document.getElementById('transcriptWrap');
const segmentsEl = document.getElementById('segments');
const viewMeetingLink = document.getElementById('viewMeetingLink');
const meetingTitleEl = document.getElementById('meetingTitle');
const engineBanner = document.getElementById('engineBanner');
const micMeterWrap = document.getElementById('micMeterWrap');
const micMeterFill = document.getElementById('micMeterFill');

let stream = null;
let mediaRecorder = null;
let chunks = [];
let recording = false;
let paused = false;
let stopRequested = false;
let recordStartTime = null;
let pauseStartedAt = null;
let timerInterval = null;
let segmentTimeout = null;
let pendingUploads = 0;

let audioCtx = null;
let analyser = null;
let meterData = null;
let meterRAF = null;

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function tickTimer() {
  timerEl.textContent = formatElapsed(Date.now() - recordStartTime);
}

// ── Engine-status ──────────────────────────────────
async function pollEngineStatus() {
  try {
    const res = await fetch('/api/engine-status');
    if (res.status === 401) return window.location.replace('login.html');
    const status = await res.json();
    renderEngineBanner(status);
    if (status.engine === 'local' && !status.ready) {
      setTimeout(pollEngineStatus, 5000);
    }
  } catch {
    // Stil falen; de banner is informatief, geen blokkerende functionaliteit.
  }
}

function renderEngineBanner(status) {
  engineBanner.style.display = 'flex';
  if (status.engine === 'openai') {
    engineBanner.className = 'engine-banner cloud';
    engineBanner.innerHTML = `<span class="dot"></span> Transcriptie via OpenAI (cloud).`;
    return;
  }
  if (status.ready) {
    engineBanner.className = 'engine-banner ready';
    engineBanner.innerHTML = `<span class="dot"></span> Lokale transcriptie is klaar (model: ${status.model}).`;
  } else {
    engineBanner.className = 'engine-banner warming';
    engineBanner.innerHTML =
      `<span class="dot"></span> Lokaal transcriptiemodel wordt nog voorbereid (eenmalig, kan enkele ` +
      `minuten duren). Je kunt gewoon starten met opnemen — het eerste fragment wordt iets later verwerkt.`;
  }
}

// ── Microfoonmeter ──────────────────────────────────
function startMicMeter(sourceStream) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    const source = audioCtx.createMediaStreamSource(sourceStream);
    source.connect(analyser);
    meterData = new Uint8Array(analyser.frequencyBinCount);
    micMeterWrap.style.display = 'block';
    updateMicMeter();
  } catch {
    micMeterWrap.style.display = 'none';
  }
}

function updateMicMeter() {
  if (!recording) return;
  if (paused || !analyser) {
    micMeterFill.style.width = '0%';
    meterRAF = requestAnimationFrame(updateMicMeter);
    return;
  }
  analyser.getByteTimeDomainData(meterData);
  let sumSquares = 0;
  for (let i = 0; i < meterData.length; i++) {
    const v = (meterData[i] - 128) / 128;
    sumSquares += v * v;
  }
  const rms = Math.sqrt(sumSquares / meterData.length);
  const pct = Math.min(100, rms * 450);
  micMeterFill.style.width = pct + '%';
  micMeterFill.classList.toggle('silent', pct < 3);
  meterRAF = requestAnimationFrame(updateMicMeter);
}

function stopMicMeter() {
  if (meterRAF) cancelAnimationFrame(meterRAF);
  if (audioCtx) audioCtx.close().catch(() => {});
  audioCtx = null;
  analyser = null;
  micMeterWrap.style.display = 'none';
}

async function loadMeetingTitle() {
  const res = await fetch(`/api/meetings/${meetingId}`);
  if (res.status === 401) return window.location.replace('login.html');
  if (!res.ok) {
    meetingTitleEl.textContent = 'Vergadering niet gevonden';
    startBtn.disabled = true;
    return;
  }
  const meeting = await res.json();
  meetingTitleEl.textContent = meeting.title;
  viewMeetingLink.href = `meeting.html?id=${encodeURIComponent(meetingId)}`;
}

function addPendingSegment(placeholderId) {
  transcriptWrap.style.display = 'block';
  const div = document.createElement('div');
  div.className = 'segment pending';
  div.id = placeholderId;
  div.textContent = 'Fragment wordt getranscribeerd…';
  segmentsEl.appendChild(div);
}

function resolveSegment(placeholderId, text) {
  const div = document.getElementById(placeholderId);
  if (!div) return;
  div.classList.remove('pending');
  div.textContent = text || '(geen spraak herkend in dit fragment)';
}

async function uploadSegment(blob, mimeType) {
  if (blob.size < 1000) return; // negeer vrijwel lege fragmenten
  const placeholderId = 'seg-' + Date.now();
  addPendingSegment(placeholderId);
  pendingUploads += 1;
  updateStatus();

  try {
    const form = new FormData();
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    form.append('audio', blob, `segment.${ext}`);
    const res = await fetch(`/api/meetings/${meetingId}/segments`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Serverfout');
    const data = await res.json();
    resolveSegment(placeholderId, data.segment.text);
  } catch (err) {
    resolveSegment(placeholderId, '⚠ Transcriptie van dit fragment is mislukt.');
    showToast('Transcriptie van een fragment is mislukt. De opname loopt gewoon door.', 'error');
  } finally {
    pendingUploads -= 1;
    updateStatus();
  }
}

function updateStatus() {
  if (paused) {
    recStatus.textContent = 'Gepauzeerd';
  } else if (recording) {
    recStatus.textContent = pendingUploads > 0
      ? `Opname loopt · ${pendingUploads} fragment${pendingUploads === 1 ? '' : 'en'} worden verwerkt`
      : 'Opname loopt';
  } else if (stopRequested && pendingUploads > 0) {
    recStatus.textContent = `Laatste fragmenten verwerken… (${pendingUploads})`;
  } else if (stopRequested) {
    recStatus.textContent = 'Opname afgerond';
  }
}

function startSegmentRecorder() {
  const mimeType = pickMimeType();
  chunks = [];
  mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    uploadSegment(blob, mediaRecorder.mimeType || 'audio/webm');

    if (!stopRequested) {
      startSegmentRecorder();
    } else {
      finishRecording();
    }
  };

  mediaRecorder.start();
  segmentTimeout = setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  }, SEGMENT_MS);
}

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    showToast('Kon geen toegang krijgen tot de microfoon: ' + err.message, 'error', 6000);
    return;
  }

  recording = true;
  paused = false;
  stopRequested = false;
  recordStartTime = Date.now();
  timerInterval = setInterval(tickTimer, 1000);
  indicator.classList.add('live');
  startBtn.disabled = true;
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-flex';
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  updateStatus();
  startMicMeter(stream);

  startSegmentRecorder();
}

function togglePause() {
  if (!paused) {
    paused = true;
    pauseStartedAt = Date.now();
    clearTimeout(segmentTimeout);
    clearInterval(timerInterval);
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.pause();
    indicator.classList.remove('live');
    pauseBtn.textContent = 'Hervat';
    updateStatus();
  } else {
    paused = false;
    recordStartTime += Date.now() - pauseStartedAt; // schuif starttijd op zodat de teller klopt
    timerInterval = setInterval(tickTimer, 1000);
    if (mediaRecorder && mediaRecorder.state === 'paused') mediaRecorder.resume();
    segmentTimeout = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, SEGMENT_MS);
    indicator.classList.add('live');
    pauseBtn.textContent = 'Pauzeer';
    updateStatus();
  }
}

function stopRecording() {
  stopRequested = true;
  paused = false;
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
  recording = false;
  clearInterval(timerInterval);
  clearTimeout(segmentTimeout);
  indicator.classList.remove('live');
  stopMicMeter();
  updateStatus();

  if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
    mediaRecorder.stop();
  } else {
    finishRecording();
  }
}

let finished = false;
async function finishRecording() {
  if (finished) return;
  finished = true;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }

  await fetch(`/api/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });

  waitForPendingThenShowLink();
}

function waitForPendingThenShowLink() {
  const reveal = () => {
    recStatus.textContent = 'Opname afgerond — transcript is klaar';
    viewMeetingLink.style.display = 'inline-flex';
  };

  if (pendingUploads === 0) {
    reveal();
    return;
  }

  const check = setInterval(() => {
    updateStatus();
    if (pendingUploads === 0) {
      clearInterval(check);
      reveal();
    }
  }, 500);
}

startBtn.addEventListener('click', startRecording);
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stopRecording);

(async () => {
  if (!meetingId) {
    document.body.innerHTML = '<p style="padding:2rem;">Geen vergadering-ID opgegeven.</p>';
    return;
  }
  if (await requireSession()) {
    loadMeetingTitle();
    pollEngineStatus();
  }
})();

window.addEventListener('beforeunload', (e) => {
  if (recording) {
    e.preventDefault();
    e.returnValue = '';
  }
});
