// Kleine, afhankelijkheidsvrije helpers voor toasts en modals, zodat we geen
// lelijke browser-alert()/confirm()/prompt() hoeven te gebruiken.

function ensureToastContainer() {
  let el = document.getElementById('toastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

function showToast(message, type = 'info', duration = 4000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function openModal({ title, bodyHtml, buttons }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">${title}</h2>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const actions = overlay.querySelector('.modal-actions');
    function close(result) {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    }

    buttons.forEach((btn) => {
      const el = document.createElement('button');
      el.className = btn.className || 'btn btn-secondary';
      el.textContent = btn.label;
      el.type = 'button';
      el.addEventListener('click', () => close(btn.value));
      actions.appendChild(el);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(undefined);
    });
    document.addEventListener(
      'keydown',
      function onKey(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          close(undefined);
        }
      },
      { once: true }
    );

    requestAnimationFrame(() => overlay.classList.add('visible'));

    const firstInput = overlay.querySelector('input, textarea');
    if (firstInput) {
      firstInput.focus();
      firstInput.select();
    }
  });
}

function showConfirmDialog({ title, message, confirmLabel = 'Bevestigen', danger = false }) {
  return openModal({
    title,
    bodyHtml: `<p>${message}</p>`,
    buttons: [
      { label: 'Annuleren', value: false, className: 'btn btn-secondary' },
      { label: confirmLabel, value: true, className: danger ? 'btn btn-danger' : 'btn btn-primary' },
    ],
  }).then((result) => Boolean(result));
}

function showPromptDialog({ title, label, defaultValue = '', confirmLabel = 'Opslaan' }) {
  const inputId = 'promptInput_' + Math.random().toString(36).slice(2);
  return openModal({
    title,
    bodyHtml: `
      <div class="field" style="margin-bottom:0;">
        <label for="${inputId}">${label}</label>
        <input type="text" id="${inputId}" value="${escapeAttr(defaultValue)}">
      </div>
    `,
    buttons: [
      { label: 'Annuleren', value: null, className: 'btn btn-secondary' },
      { label: confirmLabel, value: '__confirm__', className: 'btn btn-primary' },
    ],
  }).then((result) => {
    if (result !== '__confirm__') return null;
    const input = document.getElementById(inputId);
    return input ? input.value : null;
  });
}

function escapeAttr(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;');
}

// Bij een Enter-toets in een prompt-modal het bevestig-formulier indienen.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.modal input[type="text"]')) {
    const confirmBtn = e.target.closest('.modal').querySelector('.btn-primary');
    if (confirmBtn) confirmBtn.click();
  }
});
