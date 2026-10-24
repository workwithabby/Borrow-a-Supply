import { state, setUser } from '../state.js';
import { navigate } from '../router.js';
import { logOut } from '../services/auth.service.js';
import { TABS } from './tabbar.js';
import { mountOverlay, openSheet } from './sheet.js';
import { icon } from './icons.js';
import { esc, $, withLoading } from './ui.js';
import { btn } from './button.js';
import { avatar } from './avatar.js';

const ROLE_LABEL = { user: 'Student', staff: 'Staff', admin: 'Admin' };

const initials = (name) => (name || '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Secondary destinations that do not fit in the bottom dock.
const MORE = {
  user: [
    { label: 'Notifications', ic: 'bell', path: '/notifications' },
    { label: 'Rules and Help', ic: 'rules', path: '/rules' },
  ],
  staff: [
    { label: 'Notifications', ic: 'bell', path: '/notifications' },
    { label: 'Rules and Help', ic: 'rules', path: '/rules' },
  ],
  admin: [
    { label: 'Notifications', ic: 'bell', path: '/notifications' },
    { label: 'Room settings', ic: 'settings', path: '/admin/settings' },
    { label: 'Rules and Help', ic: 'rules', path: '/rules' },
  ],
};

const isActive = (path, target) => path === target || path.startsWith(target + '/');

function navRow(ic, label, path, current) {
  return `<button type="button" class="menu-row tap" data-nav="${esc(path)}"${current ? ' aria-current="page"' : ''}>${icon(ic, 22)}<span class="grow">${esc(label)}</span></button>`;
}

// Confirm sheet shared by the drawer and the Profile screen.
export function openLogoutSheet() {
  openSheet({
    title: 'Log out?',
    body: `<p>You will need to log in again to borrow or manage items.</p>
      ${btn({ label: 'Log out', block: true, id: 'yes' })}
      ${btn({ label: 'Stay logged in', variant: 'outline', block: true, id: 'no' })}`,
    onMount(el, close) {
      $('#no', el).addEventListener('click', () => close());
      $('#yes', el).addEventListener('click', async (e) => {
        await withLoading(e.currentTarget, () => logOut());
        setUser(null);
        close();
        navigate('/welcome', { replace: true, reset: true });
      });
    },
  });
}

function drawerHtml(path) {
  const u = state.user;
  const role = u.role;
  const tabs = TABS[role] || [];
  const more = MORE[role] || [];
  return `
    <div class="drawer-head">
      <div class="row">
        ${avatar(u, 'sm')}
        <div class="grow">
          <div class="title">${esc(u.full_name)}</div>
          <div class="sub">${esc(u.email)}</div>
        </div>
        <button type="button" class="icon-btn plain" aria-label="Close menu" data-drawer-close>${icon('close', 22)}</button>
      </div>
      <div class="profile-meta">
        <span class="chip chip-pink">${esc(ROLE_LABEL[role] || role)}</span>
        ${u.student_id ? `<span class="chip chip-active">ID ${esc(u.student_id)}</span>` : ''}
        ${u.shift ? `<span class="chip chip-muted">${esc(u.shift)}</span>` : ''}
      </div>
    </div>
    <nav class="drawer-nav" aria-label="Menu">
      ${tabs.map((t) => navRow(t.ic, t.label, t.path, isActive(path, t.path))).join('')}
      <p class="drawer-sec">More</p>
      ${more.map((t) => navRow(t.ic, t.label, t.path, isActive(path, t.path))).join('')}
      <p class="drawer-sec">Account</p>
      ${role === 'admin' ? navRow('user', 'My profile', '/admin/profile', isActive(path, '/admin/profile')) : ''}
      ${navRow('lock', 'Change password', '/account/password', isActive(path, '/account/password'))}
    </nav>
    <div class="drawer-foot">
      <button type="button" class="menu-row tap danger" id="drawer-logout">${icon('logout', 22)}<span class="grow">Log out</span></button>
    </div>`;
}

let openEntry = null;

export function openDrawer() {
  if (openEntry || !state.user) return;
  const path = location.hash.replace(/^#/, '') || '/';
  const panel = document.createElement('aside');
  panel.className = 'drawer';
  panel.innerHTML = drawerHtml(path);
  const entry = mountOverlay(panel, { labelledBy: '' });
  openEntry = entry;
  panel.setAttribute('aria-label', 'Menu');
  panel.querySelector('[data-drawer-close]').addEventListener('click', () => entry.close());
  // Links navigate through the global [data-nav] handler; close the drawer first.
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-nav]')) entry.close();
  });
  $('#drawer-logout', panel).addEventListener('click', () => {
    entry.close();
    openLogoutSheet();
  });
  const origClose = entry.close;
  entry.close = (result) => { openEntry = null; origClose(result); };
  return entry;
}

export function installDrawer() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu]')) {
      e.preventDefault();
      openDrawer();
    }
  });
}
