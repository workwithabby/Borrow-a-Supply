import { icon } from './icons.js';

// Four tabs per role, as in APP_FLOW. Bottom nav stays at 4 items.
// Exported so the side drawer can reuse the same destinations.
export const TABS = {
  user: [
    { label: 'Home', ic: 'home', path: '/borrower/home' },
    { label: 'Browse', ic: 'search', path: '/borrower/browse' },
    { label: 'My Rentals', ic: 'rentals', path: '/borrower/rentals' },
    { label: 'Profile', ic: 'user', path: '/borrower/profile' },
  ],
  staff: [
    { label: 'Queue', ic: 'rentals', path: '/staff/queue' },
    { label: 'Scan', ic: 'scan', path: '/staff/scan' },
    { label: 'Inventory', ic: 'inventory', path: '/staff/inventory' },
    { label: 'Profile', ic: 'user', path: '/staff/profile' },
  ],
  admin: [
    { label: 'Dashboard', ic: 'dashboard', path: '/admin/dashboard' },
    { label: 'Items', ic: 'package', path: '/admin/items' },
    { label: 'People', ic: 'people', path: '/admin/people' },
    { label: 'Reports', ic: 'chart', path: '/admin/reports' },
  ],
};

export function renderTabbar(el, role, activePath) {
  const tabs = TABS[role];
  if (!tabs) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.hidden = false;
  const key = `${role}`;
  // Re-render only when the role changes so the bar does not flicker between pages.
  if (el.dataset.role !== key) {
    el.dataset.role = key;
    el.innerHTML = tabs
      .map((t) => `<a class="tab" href="#${t.path}" data-path="${t.path}"><span class="pill">${icon(t.ic, 22)}</span><span>${t.label}</span></a>`)
      .join('');
  }
  el.querySelectorAll('.tab').forEach((a) => {
    // a tab is active for its own path and any deeper path (for example /borrower/item/i1 keeps Browse lit)
    const on = activePath === a.dataset.path || activePath.startsWith(a.dataset.path + '/');
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export function hideTabbar(el) {
  el.hidden = true;
}
