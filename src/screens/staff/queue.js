import { listAllRentals } from '../../services/rentals.service.js';
import { unreadCount } from '../../services/notifications.service.js';
import { onLeave } from '../../router.js';
import { screenEl, esc, fmtTime, clock, tick, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { iconBtn } from '../../components/button.js';
import { bubble, itemBubble } from '../../components/card.js';
import { icon } from '../../components/icons.js';
import { statusChip } from '../../components/chip.js';
import { emptyState } from '../../components/empty-state.js';
import { loadInto, loadAll } from '../../components/load.js';

// Urgency first: overdue, then people waiting at the counter, then items out.
const GROUPS = [
  { id: 'overdue', title: 'Overdue', tint: 'pink', ic: 'warning' },
  { id: 'reserved', title: 'Waiting for pickup', tint: 'yellow', ic: 'clock' },
  { id: 'active', title: 'Out with students', tint: 'sky', ic: 'rentals' },
];

export default function queue() {
  const el = screenEl(`${topbar({ title: 'Queue', back: false, actions: iconBtn({ ic: 'bell', label: 'Notifications', nav: '/notifications', id: 'bell' }) })}<div class="content" id="body"></div>`);

  loadInto($('#body', el), () => loadAll(listAllRentals({ status: ['reserved', 'active', 'overdue'] }), unreadCount()), ([list, unread], b) => {
    if (unread > 0) {
      $('#bell', el).insertAdjacentHTML('beforeend', '<span class="dot" aria-hidden="true"></span>');
      $('#bell', el).setAttribute('aria-label', `Notifications, ${unread} new`);
    }
    if (!list.length) {
      b.innerHTML = emptyState({ title: 'The queue is clear', text: 'New reservations will show up here.', action: { label: 'Open scanner', nav: '/staff/scan' } });
      return;
    }
    b.innerHTML = GROUPS.map((g) => {
      const rows = list.filter((r) => r.status === g.id);
      if (!rows.length) return '';
      return `<section aria-labelledby="g-${g.id}">
        <div class="queue-h">${bubble(g.ic, g.tint, 'sm')}<h2 class="sec" id="g-${g.id}">${g.title}</h2>
          <span class="chip chip-muted">${rows.length}</span></div>
        <div class="list">${rows.map((r) => {
          const meta = g.id === 'reserved'
            ? `${r.paid ? 'Paid' : 'Pay at the room'}<span class="sep" aria-hidden="true">&middot;</span>Hold <strong data-hold="${r.hold_until}"></strong>`
            : g.id === 'overdue'
              ? `Due ${fmtTime(r.due_at)}<span class="sep" aria-hidden="true">&middot;</span><strong data-due="${r.due_at}"></strong>`
              : `Due ${fmtTime(r.due_at)}`;
          return `
          <button type="button" class="card tap queue-row q-${g.id}" data-nav="/staff/reservation/${r.id}">
            <div class="row">${itemBubble(r.item)}
              <div class="grow"><div class="title">${esc(r.user.full_name)}</div>
              <div class="sub">${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}${r.user.student_id ? ` &middot; ${esc(r.user.student_id)}` : ''}</div></div>
              ${statusChip(r.status)}</div>
            <div class="queue-meta">${icon(g.id === 'overdue' ? 'warning' : 'clock', 15)}<span class="grow">${meta}</span></div>
          </button>`;
        }).join('')}</div>
      </section>`;
    }).join('');
    // Reserved rows count down to the hold expiry; overdue rows show how late it is.
    const stops = [];
    $$('[data-hold]', b).forEach((n) => stops.push(tick(n, () => {
      const ms = new Date(n.dataset.hold) - Date.now();
      n.textContent = ms > 0 ? clock(ms) : 'expired';
    })));
    $$('[data-due]', b).forEach((n) => stops.push(tick(n, () => {
      n.textContent = `late by ${clock(Date.now() - new Date(n.dataset.due))}`;
    })));
    onLeave(() => stops.forEach((s) => s()));
    staggerIn(b, '.list > *');
  });
  return el;
}
