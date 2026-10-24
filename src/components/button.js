import { icon } from './icons.js';
import { esc } from './ui.js';

// variant: primary | secondary | outline | ghost | danger
export function btn({ label, variant = 'primary', ic = '', block = false, type = 'button', id = '', nav = '', size = '', disabled = false, attrs = '' }) {
  const cls = ['btn', `btn-${variant}`, block ? 'btn-block' : '', size ? `btn-${size}` : ''].filter(Boolean).join(' ');
  return `<button type="${type}" class="${cls}" ${id ? `id="${id}"` : ''} ${nav ? `data-nav="${esc(nav)}"` : ''} ${disabled ? 'disabled' : ''} ${attrs}>${ic ? icon(ic, 20) : ''}<span>${esc(label)}</span></button>`;
}

export function iconBtn({ ic, label, id = '', nav = '', back = false, plain = false, dot = false, attrs = '' }) {
  return `<button type="button" class="icon-btn ${plain ? 'plain' : ''}" aria-label="${esc(label)}" ${id ? `id="${id}"` : ''} ${nav ? `data-nav="${esc(nav)}"` : ''} ${back ? 'data-back' : ''} ${attrs}>${icon(ic, 22)}${dot ? '<span class="dot" aria-hidden="true"></span>' : ''}</button>`;
}

// Quiet text action that sits beside a section title (e.g. "See all").
export function linkBtn(label, nav) {
  return `<button type="button" class="link-btn" data-nav="${esc(nav)}">${esc(label)}${icon('next', 14)}</button>`;
}
