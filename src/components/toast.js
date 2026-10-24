import { animate } from 'motion';
import { icon } from './icons.js';
import { esc, $, reduceMotion } from './ui.js';

// type: success | error | info. The toast root is a polite live region, so screen readers announce it.
export function toast(message, type = 'success') {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type === 'success' ? '' : type}`;
  el.innerHTML = `${icon(type === 'error' ? 'warning' : type === 'info' ? 'info' : 'ok', 20)}<span>${esc(message)}</span>`;
  root.append(el);
  if (!reduceMotion()) animate(el, { opacity: [0, 1], transform: ['translateY(-16px)', 'translateY(0px)'] }, { duration: 0.22 });
  setTimeout(() => {
    const done = () => el.remove();
    if (reduceMotion()) return done();
    animate(el, { opacity: 0, transform: 'translateY(-10px)' }, { duration: 0.2 }).finished.then(done);
  }, type === 'error' ? 4500 : 3000);
}
