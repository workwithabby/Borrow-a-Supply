import { starShape } from './icons.js';
import { btn } from './button.js';
import { esc } from './ui.js';

// Every list gets one: a small star, one short line, one button.
export function emptyState({ title, text = '', action = null }) {
  return `
  <div class="empty">
    <span class="bubble lg tint-yellow">${starShape(40)}</span>
    <h2>${esc(title)}</h2>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${action ? btn({ label: action.label, nav: action.nav || '', id: action.id || '', variant: 'secondary' }) : ''}
  </div>`;
}

export function errorState(message = 'Something went wrong.', retryId = 'retry') {
  return `
  <div class="empty" role="alert">
    <span class="bubble lg tint-pink">${starShape(40)}</span>
    <h2>Oops</h2>
    <p>${esc(message)}</p>
    ${btn({ label: 'Try again', id: retryId, variant: 'outline' })}
  </div>`;
}
