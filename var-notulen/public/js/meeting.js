const params = new URLSearchParams(window.location.search);
const meetingId = params.get('id');
const AUTOSAVE_DELAY_MS = 2500;

const titleInput = document.getElementById('titleInput');
const metaLine = document.getElementById('metaLine');
const transcriptEditor = document.getElementById('transcriptEditor');
const saveBtn = document.getElementById('saveBtn');
const saveHint = document.getElementById('saveHint');
const deleteBtn = document.getElementById('deleteBtn');
const exportDocx = document.getElementById('exportDocx');
const exportTxt = document.getElementById('exportTxt');

let dirty = false;
let autosaveTimer = null;
let saving = false;

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

function markDirty() {
  dirty = true;
  saveHint.innerHTML = '<span class="unsaved-dot">Niet opgeslagen</span>';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveChanges, AUTOSAVE_DELAY_MS);
}

async function saveChanges() {
  if (saving) return;
  clearTimeout(autosaveTimer);
  saving = true;
  saveBtn.disabled = true;
  saveHint.textContent = 'Opslaan…';

  try {
    const res = await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.value, fullText: transcriptEditor.value }),
    });
    if (!res.ok) throw new Error('Serverfout');
    dirty = false;
    saveHint.textContent = 'Opgeslagen ✓';
    setTimeout(() => {
      if (!dirty) saveHint.textContent = '';
    }, 2500);
  } catch {
    saveHint.innerHTML = '<span class="unsaved-dot">Opslaan mislukt — probeer opnieuw</span>';
    showToast('Opslaan is mislukt. Controleer je verbinding en probeer opnieuw.', 'error');
  } finally {
    saving = false;
    saveBtn.disabled = false;
  }
}

async function deleteMeeting() {
  const confirmed = await showConfirmDialog({
    title: 'Vergadering verwijderen',
    message: `Weet je zeker dat je “${titleInput.value}” definitief wilt verwijderen? Het transcript kan daarna niet meer worden teruggehaald.`,
    confirmLabel: 'Verwijderen',
    danger: true,
  });
  if (!confirmed) return;

  deleteBtn.disabled = true;
  try {
    const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Serverfout');
    window.location.href = 'dashboard.html';
  } catch {
    showToast('Verwijderen is mislukt. Probeer het opnieuw.', 'error');
    deleteBtn.disabled = false;
  }
}

saveBtn.addEventListener('click', saveChanges);
deleteBtn.addEventListener('click', deleteMeeting);
titleInput.addEventListener('input', markDirty);
transcriptEditor.addEventListener('input', markDirty);

window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

(async () => {
  if (!meetingId) {
    document.querySelector('main').innerHTML = '<div class="card empty-state">Geen vergadering-ID opgegeven.</div>';
    return;
  }
  if (await requireSession()) loadMeeting();
})();
