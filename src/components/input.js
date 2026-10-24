import { icon } from './icons.js';
import { esc, $, $$ } from './ui.js';

// A labeled field with room for an error message. Labels are always visible.
export function field({ name, label, type = 'text', value = '', placeholder = '', autocomplete = '', hint = '', inputmode = '', maxlength = '', required = true }) {
  const isPw = type === 'password';
  return `
  <div class="field" data-field="${name}">
    <label for="f-${name}">${esc(label)}</label>
    <div class="input-wrap">
      <input class="input ${isPw ? 'has-trail' : ''}" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}"
        placeholder="${esc(placeholder)}" ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''}
        ${maxlength ? `maxlength="${maxlength}"` : ''} ${required ? 'required' : ''} aria-describedby="e-${name}${hint ? ` h-${name}` : ''}" />
      ${isPw ? `<button type="button" class="icon-btn plain trail" data-toggle-pw="f-${name}" aria-label="Show password" aria-pressed="false">${icon('eye', 22)}</button>` : ''}
    </div>
    ${hint ? `<p class="field-hint" id="h-${name}">${esc(hint)}</p>` : ''}
    <p class="field-error" id="e-${name}" hidden></p>
  </div>`;
}

export function selectField({ name, label, options, value = '' }) {
  return `
  <div class="field" data-field="${name}">
    <label for="f-${name}">${esc(label)}</label>
    <select class="select" id="f-${name}" name="${name}" aria-describedby="e-${name}">
      ${options.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>
    <p class="field-error" id="e-${name}" hidden></p>
  </div>`;
}

export function textareaField({ name, label, value = '', placeholder = '' }) {
  return `
  <div class="field" data-field="${name}">
    <label for="f-${name}">${esc(label)}</label>
    <textarea class="textarea" id="f-${name}" name="${name}" placeholder="${esc(placeholder)}" aria-describedby="e-${name}">${esc(value)}</textarea>
    <p class="field-error" id="e-${name}" hidden></p>
  </div>`;
}

// Wire the show/hide password buttons inside a root element.
export function bindPasswordToggles(root) {
  $$('[data-toggle-pw]', root).forEach((b) => {
    b.addEventListener('click', () => {
      const input = $('#' + b.dataset.togglePw, root);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      b.setAttribute('aria-pressed', String(show));
      b.innerHTML = icon(show ? 'eye-off' : 'eye', 22);
    });
  });
}

// Live password requirements. Pairs with a password field inside the same root.
const PW_RULES = {
  len: (v) => v.length >= 8,
  alpha: (v) => /[a-zA-Z]/.test(v),
  num: (v) => /\d/.test(v),
};

export const passwordRules = () => `
  <ul class="pw-rules" id="pw-rules">
    <li data-rule="len">8+ characters</li>
    <li data-rule="alpha">A letter</li>
    <li data-rule="num">A number</li>
  </ul>`;

export function bindPasswordRules(root, input) {
  const described = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  described.add('pw-rules');
  input.setAttribute('aria-describedby', [...described].join(' '));
  const sync = () => {
    const v = input.value;
    $$('[data-rule]', root).forEach((li) => li.classList.toggle('ok', PW_RULES[li.dataset.rule](v)));
  };
  input.addEventListener('input', sync);
}

export function setError(root, name, message) {
  const wrap = $(`[data-field="${name}"]`, root);
  if (!wrap) return;
  const msg = $('.field-error', wrap);
  const input = $('input, select, textarea', wrap);
  if (message) {
    wrap.classList.add('has-error');
    msg.innerHTML = icon('warning', 16) + `<span>${esc(message)}</span>`;
    msg.hidden = false;
    input && input.setAttribute('aria-invalid', 'true');
  } else {
    wrap.classList.remove('has-error');
    msg.hidden = true;
    msg.textContent = '';
    input && input.removeAttribute('aria-invalid');
  }
}

// errors: { fieldName: 'message' }. Clears the rest and focuses the first bad field.
export function showErrors(root, errors) {
  $$('[data-field]', root).forEach((w) => setError(root, w.dataset.field, errors[w.dataset.field] || ''));
  const first = Object.keys(errors)[0];
  if (first) $(`#f-${first}`, root)?.focus();
}

// Clear a field's error as soon as the person edits it.
export function liveClear(root) {
  root.addEventListener('input', (e) => {
    const wrap = e.target.closest('[data-field]');
    if (wrap && wrap.classList.contains('has-error')) setError(root, wrap.dataset.field, '');
  });
}

export function formError(root, message) {
  let box = $('.form-error', root);
  if (!box) {
    box = document.createElement('div');
    box.className = 'form-error';
    box.setAttribute('role', 'alert');
    const form = $('form', root) || root;
    form.prepend(box);
  }
  box.textContent = message || '';
  box.hidden = !message;
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
