import { btn } from './button.js';
import { esc } from './ui.js';
import { mountOverlay } from './sheet.js';

// "Are you sure?" dialog. Resolves true when confirmed, false otherwise.
export function confirmDialog({ title, message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const panel = document.createElement('div');
    panel.className = 'modal';
    panel.innerHTML = `
      <h2 id="modal-title">${esc(title)}</h2>
      ${message ? `<p>${esc(message)}</p>` : ''}
      <div class="form">
        ${btn({ label: confirmLabel, variant: danger ? 'primary' : 'primary', id: 'modal-ok', block: true, attrs: 'data-autofocus' })}
        ${btn({ label: cancelLabel, variant: 'outline', id: 'modal-cancel', block: true })}
      </div>`;
    const entry = mountOverlay(panel, { labelledBy: 'modal-title', onClose: (r) => resolve(r === true) });
    panel.querySelector('#modal-ok').addEventListener('click', () => entry.close(true));
    panel.querySelector('#modal-cancel').addEventListener('click', () => entry.close(false));
  });
}
