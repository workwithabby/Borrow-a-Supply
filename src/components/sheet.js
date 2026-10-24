import { animate } from 'motion';
import { iconBtn } from './button.js';
import { esc, $, reduceMotion } from './ui.js';

// Stack of open sheets and modals. The Android back button closes the top one first.
const stack = [];

export function closeTopOverlay() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

export const hasOverlay = () => stack.length > 0;

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared by sheets and modals: backdrop, focus handling, Escape key, focus restore.
export function mountOverlay(panel, { labelledBy, onClose, dismissible = true }) {
  const root = $('#overlay-root');
  const opener = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  if (labelledBy) panel.setAttribute('aria-labelledby', labelledBy);
  root.append(backdrop, panel);
  // hide the page behind from screen readers while open
  $('#view').setAttribute('aria-hidden', 'true');
  $('#tabbar').setAttribute('aria-hidden', 'true');

  let closed = false;
  const entry = {
    close(result) {
      if (closed) return;
      closed = true;
      stack.splice(stack.indexOf(entry), 1);
      document.removeEventListener('keydown', onKey);
      const done = () => {
        panel.remove();
        backdrop.remove();
        if (!stack.length) {
          $('#view').removeAttribute('aria-hidden');
          $('#tabbar').removeAttribute('aria-hidden');
        }
        if (opener && opener.isConnected) opener.focus();
        onClose && onClose(result);
      };
      if (reduceMotion()) return done();
      animate(backdrop, { opacity: 0 }, { duration: 0.15 });
      const exit = panel.classList.contains('sheet') ? 'translateY(40px)'
        : panel.classList.contains('drawer') ? 'translateX(-104%)'
        : 'translateY(-50%) scale(0.96)';
      animate(panel, { opacity: 0, transform: exit }, { duration: 0.18 }).finished.then(done);
    },
  };
  const onKey = (e) => {
    if (stack[stack.length - 1] !== entry) return;
    if (e.key === 'Escape' && dismissible) entry.close();
    if (e.key === 'Tab') {
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  if (dismissible) backdrop.addEventListener('click', () => entry.close());
  stack.push(entry);

  if (!reduceMotion()) {
    animate(backdrop, { opacity: [0, 1] }, { duration: 0.18 });
    if (panel.classList.contains('drawer')) animate(panel, { transform: ['translateX(-104%)', 'translateX(0%)'] }, { duration: 0.28, ease: [0.22, 1, 0.36, 1] });
    else if (panel.classList.contains('sheet')) animate(panel, { transform: ['translateY(100%)', 'translateY(0%)'] }, { duration: 0.28, ease: [0.22, 1, 0.36, 1] });
    else animate(panel, { opacity: [0, 1], transform: ['translateY(-46%) scale(0.96)', 'translateY(-50%) scale(1)'] }, { duration: 0.2 });
  }
  (panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE))?.focus();
  return entry;
}

// Bottom sheet. onMount(el, close) lets the screen wire its buttons.
export function openSheet({ title, body, onMount, onClose }) {
  const panel = document.createElement('div');
  panel.className = 'sheet';
  panel.innerHTML = `
    <div class="sheet-grab" aria-hidden="true"></div>
    <div class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2>${iconBtn({ ic: 'close', label: 'Close', plain: true, attrs: 'data-sheet-close' })}</div>
    <div class="sheet-body">${body}</div>`;
  const entry = mountOverlay(panel, { labelledBy: 'sheet-title', onClose });
  panel.querySelector('[data-sheet-close]').addEventListener('click', () => entry.close());
  onMount && onMount(panel, (r) => entry.close(r));
  return entry;
}
