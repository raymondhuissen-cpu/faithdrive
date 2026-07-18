const SEGMENT_MS = 2 * 60 * 1000; // splits opname elke 2 minuten voor tussentijdse transcriptie

const params = new URLSearchParams(window.location.search);
const meetingId = params.get('id');

const indicator = document.getElementById('indicator');
const timerEl = document.getElementById('timer');
const recStatus = document.getElementById('recStatus');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const transcriptWrap = document.getElementById('transcriptWrap');
const segmentsEl = document.getElementById('segments');
const viewMeetingLink = document.getElementById('viewMeetingLink');
const meetingTitleEl = document.getElementById('meetingTitle');

let stream = null;
let mediaRecorder = null;
let chunks = [];
let recording = false;
let stopRequested = false;
let recordStartTime = null;
let timerInterval = null;
let segmentTimeout = null;
let pendingUploads = 0;

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
  } finally {
    pendingUploads -= 1;
    updateStatus();
  }
}

function updateStatus() {
  if (recording) {
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
    alert('Kon geen toegang krijgen tot de microfoon: ' + err.message);
    return;
  }

  recording = true;
  stopRequested = false;
  recordStartTime = Date.now();
  timerInterval = setInterval(tickTimer, 1000);
  indicator.classList.add('live');
  startBtn.disabled = true;
  stopBtn.disabled = false;
  updateStatus();

  startSegmentRecorder();
}

function stopRecording() {
  stopRequested = true;
  stopBtn.disabled = true;
  recording = false;
  clearInterval(timerInterval);
  clearTimeout(segmentTimeout);
  indicator.classList.remove('live');
  updateStatus();

  if (mediaRecorder && mediaRecorder.state === 'recording') {
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

  viewMeetingLink.style.display = 'inline-flex';
  waitForPendingThenRedirect();
}

function waitForPendingThenRedirect() {
  const check = setInterval(() => {
    updateStatus();
    if (pendingUploads === 0) {
      clearInterval(check);
      recStatus.textContent = 'Opname afgerond — transcript is klaar';
    }
  }, 500);
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

(async () => {
  if (!meetingId) {
    document.body.innerHTML = '<p style="padding:2rem;">Geen vergadering-ID opgegeven.</p>';
    return;
  }
  if (await requireSession()) loadMeetingTitle();
})();

window.addEventListener('beforeunload', (e) => {
  if (recording) {
    e.preventDefault();
    e.returnValue = '';
  }
});
