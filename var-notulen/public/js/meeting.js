const params = new URLSearchParams(window.location.search);
const meetingId = params.get('id');

const titleInput = document.getElementById('titleInput');
const metaLine = document.getElementById('metaLine');
const transcriptEditor = document.getElementById('transcriptEditor');
const saveBtn = document.getElementById('saveBtn');
const saveHint = document.getElementById('saveHint');
const deleteBtn = document.getElementById('deleteBtn');
const exportDocx = document.getElementById('exportDocx');
const exportTxt = document.getElementById('exportTxt');

function formatDate(iso) {
  return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' });
}

async function loadMeeting() {
  const res = await fetch(`/api/meetings/${meetingId}`);
  if (res.status === 401) return window.location.replace('login.html');
  if (!res.ok) {
    document.querySelector('main').innerHTML = '<div class="card empty-state">Vergadering niet gevonden.</div>';
    return;
  }
  const meeting = await res.json();
  titleInput.value = meeting.title;
  metaLine.textContent = `${formatDate(meeting.createdAt)} · ${meeting.status === 'recording' ? 'Opname loopt nog' : 'Afgerond'}`;
  transcriptEditor.value = meeting.fullText || '';

  exportDocx.href = `/api/meetings/${meetingId}/export?format=docx`;
  exportTxt.href = `/api/meetings/${meetingId}/export?format=txt`;
}

async function saveChanges() {
  saveBtn.disabled = true;
  saveHint.textContent = 'Opslaan…';
  const res = await fetch(`/api/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: titleInput.value, fullText: transcriptEditor.value }),
  });
  saveBtn.disabled = false;
  saveHint.textContent = res.ok ? 'Opgeslagen ✓' : 'Opslaan mislukt';
  setTimeout(() => { saveHint.textContent = ''; }, 2500);
}

async function deleteMeeting() {
  if (!confirm('Deze vergadering en het transcript definitief verwijderen?')) return;
  await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
  window.location.href = 'dashboard.html';
}

saveBtn.addEventListener('click', saveChanges);
deleteBtn.addEventListener('click', deleteMeeting);

(async () => {
  if (!meetingId) {
    document.querySelector('main').innerHTML = '<div class="card empty-state">Geen vergadering-ID opgegeven.</div>';
    return;
  }
  if (await requireSession()) loadMeeting();
})();
