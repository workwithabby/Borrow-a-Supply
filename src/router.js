// A small hash router (#/login, #/borrower/home) with route guards and a back stack.
// Hash routes need no server, so they work inside the Capacitor APK.
import { state, homeFor } from './state.js';
import { renderTabbar, hideTabbar } from './components/tabbar.js';
import { closeTopOverlay } from './components/sheet.js';
import { $, fadeIn } from './components/ui.js';

const routes = [];
let notFound = null;
let stack = [];
let replacing = false;
let resetting = false;
let token = 0;
let leaveFns = [];

// access: public | guest (logged-out only) | auth | user | staff | admin
export function route(path, def) {
  const keys = [];
  const re = new RegExp('^' + path.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ re, keys, ...def });
}
export const setNotFound = (def) => { notFound = def; };

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)), full: raw };
}

export function navigate(path, { replace = false, reset = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) return handle();
  if (replace || reset) {
    replacing = replace;
    resetting = reset;
    location.replace(target);
  } else {
    location.hash = path;
  }
}

export function back() {
  if (closeTopOverlay()) return;
  if (stack.length > 1) history.back();
  else navigate(state.user ? homeFor(state.user.role) : '/welcome', { replace: true, reset: true });
}

// Screens call this to clean up timers or a 3D scene when the page changes.
export const onLeave = (fn) => leaveFns.push(fn);

function track(full) {
  if (resetting) stack = [full];
  else if (replacing && stack.length) stack[stack.length - 1] = full;
  else if (stack.length > 1 && stack[stack.length - 2] === full) stack.pop();
  else if (stack[stack.length - 1] !== full) stack.push(full);
  replacing = false;
  resetting = false;
}

async function handle() {
  const { path, query, full } = parse();
  const my = ++token;
  let def = null;
  let params = {};
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      def = r;
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      break;
    }
  }
  const user = state.user;

  // ---- route guards ----
  if (def) {
    const a = def.access || 'public';
    if (a === 'guest' && user) return navigate(homeFor(user.role), { replace: true, reset: true });
    if (a !== 'public' && a !== 'guest' && !user) return navigate('/login', { replace: true, reset: true });
    if (['user', 'staff', 'admin'].includes(a) && user.role !== a) return navigate(homeFor(user.role), { replace: true, reset: true });
  }

  track(full);
  leaveFns.forEach((fn) => { try { fn(); } catch (e) { /* ignore cleanup errors */ } });
  leaveFns = [];

  const view = $('#view');
  const useDef = def || notFound;
  if (useDef.tabs && user) renderTabbar($('#tabbar'), user.role, path);
  else hideTabbar($('#tabbar'));

  const ctx = { params, query, user, path };
  let el;
  try {
    el = await useDef.render(ctx);
  } catch (e) {
    console.error(e);
    el = document.createElement('div');
    el.className = 'empty';
    el.innerHTML = '<h2>Something broke</h2><p>Please go back and try again.</p>';
  }
  if (my !== token) return; // a newer navigation started, drop this one

  view.replaceChildren(el);
  view.scrollTop = 0;
  fadeIn(el);
  const h1 = el.querySelector('h1');
  document.title = (h1 ? h1.textContent.trim() + ' | ' : '') + 'Borrow-a-Supply';
  // move focus to the page heading so screen readers announce the new page
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
}

export function start() {
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); navigate(nav.dataset.nav); return; }
    if (e.target.closest('[data-back]')) { e.preventDefault(); back(); }
  });
  window.addEventListener('hashchange', handle);
  // Capacitor: wire the Android back button to this (see CAPACITOR.md)
  window.basBack = back;
  if (!location.hash) { replacing = true; location.replace('#/splash'); } else handle();
}
