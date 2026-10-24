// Small helpers shared by every screen.
import { animate, stagger } from 'motion';

export const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Escape text before it goes into innerHTML.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH');

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
export function fmtWhen(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? `Today, ${fmtTime(iso)}` : `${fmtDay(iso)}, ${fmtTime(iso)}`;
}
export function timeAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} hr ago`;
  return `${Math.round(min / 1440)} d ago`;
}

// "1:05:09" or "12:30" from a number of milliseconds.
export function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Runs fn every second until the element leaves the page. Returns a stop function.
export function tick(el, fn) {
  fn();
  const id = setInterval(() => {
    if (!el.isConnected) return clearInterval(id);
    fn();
  }, 1000);
  return () => clearInterval(id);
}

// Slide a list of children in one after another.
export function staggerIn(parent, selector = ':scope > *') {
  const kids = [...parent.querySelectorAll(selector)].slice(0, 12);
  if (!kids.length || reduceMotion()) return;
  animate(kids, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: 0.28, delay: stagger(0.04) });
}

export function fadeIn(el) {
  if (!el) return;
  if (reduceMotion()) return animate(el, { opacity: [0, 1] }, { duration: 0.12 });
  return animate(el, { opacity: [0, 1], transform: ['translateX(12px)', 'translateX(0px)'] }, { duration: 0.22 });
}

// Button press scale using Motion. Works for every .btn, .icon-btn, .tab and .tap.
export function installPressEffect() {
  const sel = '.btn, .icon-btn, .tab, .tap, .filter-chip';
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest(sel);
    if (!el || el.disabled || reduceMotion()) return;
    animate(el, { scale: 0.97 }, { duration: 0.08 });
    const up = () => {
      animate(el, { scale: 1 }, { duration: 0.14 });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.removeEventListener(t, up));
    };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, up));
  });
}

// Show a spinner inside a button while a promise runs. Always restores the button.
export async function withLoading(btn, work) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="sr-only">Loading</span>';
  try {
    return await work();
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.innerHTML = label;
    }
  }
}

export const loadingBlock = () => '<div class="loading" role="status" aria-label="Loading"><span class="spinner" aria-hidden="true"></span></div>';

// Make a screen container from an html string.
export function screenEl(html, cls = '') {
  const s = document.createElement('section');
  s.className = `screen ${cls}`.trim();
  s.innerHTML = html;
  return s;
}
