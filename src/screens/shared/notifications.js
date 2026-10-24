import { listNotifications, markAllRead, markRead } from '../../services/notifications.service.js';
import { screenEl, esc, timeAgo, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { bubble } from '../../components/card.js';
import { emptyState } from '../../components/empty-state.js';
import { loadInto } from '../../components/load.js';

const ICON_FOR = [
  [/confirmed|reservation/i, 'check', 'mint'], [/due|late|overdue/i, 'clock', 'yellow'], [/announce/i, 'megaphone', 'sky'],
  [/damage|low stock/i, 'warning', 'pink'], [/return|thanks/i, 'ok', 'mint'],
];
const look = (title) => ICON_FOR.find(([re]) => re.test(title)) || [null, 'bell', 'purple'];

export default function notificationsScreen() {
  const el = screenEl(`${topbar({ title: 'Notifications', actions: btn({ label: 'Mark all read', variant: 'ghost', size: 'sm', id: 'all' }) })}<div class="content" id="body"></div>`);
  const body = $('#body', el);

  loadInto(body, listNotifications, (list, b, reload) => {
    $('#all', el).hidden = !list.some((n) => !n.read);
    if (!list.length) {
      b.innerHTML = emptyState({ title: 'Nothing here yet', text: 'Updates about your rentals will show up here.' });
      return;
    }
    b.innerHTML = `<ul class="list" role="list">${list.map((n) => {
      const [, ic, tint] = look(n.title);
      return `<li><button type="button" class="card tap note ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="row">${bubble(ic, tint, 'sm')}
          <div class="grow"><div class="title">${esc(n.title)}${n.read ? '' : '<span class="sr-only"> (new)</span>'}</div>
          <div class="sub">${esc(n.body)}</div></div>
          <span class="sub">${timeAgo(n.created_at)}</span></div></button></li>`;
    }).join('')}</ul>`;
    staggerIn(b, '.list > li');
    $$('.note', b).forEach((c) => c.addEventListener('click', async () => {
      c.classList.remove('unread');
      await markRead(c.dataset.id);
    }));
    $('#all', el).onclick = async () => { await markAllRead(); reload(); };
  });
  return el;
}
