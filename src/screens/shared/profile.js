import { state } from '../../state.js';
import { listMyRentals } from '../../services/rentals.service.js';
import { getPrefs, setPrefs } from '../../services/notifications.service.js';
import { screenEl, esc, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { openSheet } from '../../components/sheet.js';
import { openLogoutSheet } from '../../components/drawer.js';
import { loadInto } from '../../components/load.js';
import { avatar } from '../../components/avatar.js';
import { toast } from '../../components/toast.js';

function menuRow(ic, label, detail, attr) {
  return `<button type="button" class="menu-row tap" ${attr}>
    <span class="menu-ic">${icon(ic, 20)}</span>
    <span class="grow"><span class="menu-label">${label}</span><span class="sub">${detail}</span></span>
    ${icon('next', 20)}</button>`;
}

function openNotifySheet() {
  openSheet({
    title: 'Notification settings',
    body: '<div id="prefs" class="loading"><span class="spinner" aria-hidden="true"></span></div>',
    async onMount(el) {
      const { data } = await getPrefs();
      const rows = [['reservations', 'Reservation updates', 'Confirmed, ready for pickup'], ['reminders', 'Due reminders', 'Due soon and overdue'], ['announcements', 'Announcements', 'News from the Borrow Room']];
      $('#prefs', el).className = 'prefs';
      $('#prefs', el).innerHTML = rows.map(([k, t, d]) => `
        <label class="switch-row"><span class="grow"><strong>${t}</strong><span class="sub">${d}</span></span>
        <input type="checkbox" role="switch" data-pref="${k}" ${data[k] ? 'checked' : ''} /></label>`).join('');
      $$('[data-pref]', el).forEach((i) => i.addEventListener('change', async () => {
        await setPrefs({ [i.dataset.pref]: i.checked });
        toast('Saved.', 'info');
      }));
    },
  });
}

const ROLE = { user: 'Student', staff: 'Staff', admin: 'Admin' };

// One profile screen for every role. Rows change by role.
export default function profile() {
  const u = state.user;
  const role = u.role;

  const account = [];
  account.push(menuRow('edit', 'Edit profile', role === 'user' ? 'Photo, name and student ID' : 'Photo and name', 'data-nav="/account/edit"'));
  account.push(menuRow('lock', 'Change password', 'Keep your account secure', 'data-nav="/account/password"'));

  const manage = role === 'admin' ? menuRow('settings', 'Room settings', 'Hours, limits and fees', 'data-nav="/admin/settings"') : '';
  const support = [
    menuRow('rules', 'Borrowing rules and Help', 'Fees, sessions and returns', 'data-nav="/rules"'),
    menuRow('bell', 'Notification settings', 'Reservations, reminders and news', 'id="notify"'),
  ].join('');

  const el = screenEl(`
    ${topbar({ title: 'Profile', back: false })}
    <div class="content">
      <div class="card profile-card center">
        <span class="profile-pic">${avatar(u, 'xl')}<button type="button" class="pic-edit" data-nav="/account/edit" aria-label="Change profile photo">${icon('camera', 16)}</button></span>
        <h2>${esc(u.full_name)}</h2>
        <p class="sub">${esc(u.email)}</p>
        <div class="profile-meta">
          <span class="chip chip-muted">${ROLE[role]}</span>
          ${u.student_id ? `<span class="chip chip-pink">Student ID ${esc(u.student_id)}</span>` : ''}
          ${u.shift ? `<span class="chip chip-active">${esc(u.shift)}</span>` : ''}
        </div>
      </div>
      ${role === 'user' ? '<div class="card stat-strip" id="stats"></div>' : ''}
      <h2 class="menu-sec">Account</h2>
      <div class="card menu">${account.join('')}</div>
      ${manage ? `<h2 class="menu-sec">Manage</h2><div class="card menu">${manage}</div>` : ''}
      <h2 class="menu-sec">Support</h2>
      <div class="card menu">${support}</div>
      ${btn({ label: 'Log out', variant: 'danger', ic: 'logout', block: true, id: 'logout' })}
    </div>`);
  $('#notify', el).addEventListener('click', openNotifySheet);
  $('#logout', el).addEventListener('click', openLogoutSheet);

  // Borrowers get a quick read on their own activity.
  if (role === 'user') {
    loadInto($('#stats', el), listMyRentals, (all, box) => {
      const count = (statuses) => all.filter((r) => statuses.includes(r.status)).length;
      box.innerHTML = `
        <div><span class="rs-num">${count(['active', 'overdue'])}</span><span class="rs-label">On loan</span></div>
        <div><span class="rs-num">${count(['reserved'])}</span><span class="rs-label">Reserved</span></div>
        <div><span class="rs-num">${count(['returned'])}</span><span class="rs-label">Returned</span></div>`;
    });
  }
  return el;
}
