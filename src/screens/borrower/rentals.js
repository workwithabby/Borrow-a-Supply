import { listMyRentals, cancel } from '../../services/rentals.service.js';
import { onLeave } from '../../router.js';
import { screenEl, esc, fmtTime, fmtWhen, clock, tick, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { rentalRow, itemBubble } from '../../components/card.js';
import { statusChip } from '../../components/chip.js';
import { emptyState } from '../../components/empty-state.js';
import { renderQr } from '../../components/qr.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto } from '../../components/load.js';

const TABS = [
  { id: 'active', label: 'Active', match: (r) => ['active', 'overdue'].includes(r.status) },
  { id: 'reserved', label: 'Reserved', match: (r) => r.status === 'reserved' },
  { id: 'history', label: 'History', match: (r) => ['returned', 'cancelled', 'expired'].includes(r.status) },
];

// Reserved and out items share a ticket: who/what, the QR pass, and a live timer.
function openCard(r) {
  const reserved = r.status === 'reserved';
  return `<article class="card ticket">
    <button type="button" class="ticket-head tap" data-nav="/borrower/rental/${r.id}">
      <div class="row">
        ${itemBubble(r.item)}
        <div class="grow">
          <div class="title">${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}</div>
          <div class="sub">${reserved ? `Hold until ${fmtTime(r.hold_until)}` : `Due ${fmtWhen(r.due_at)}`}</div>
        </div>
        ${statusChip(r.status)}
      </div>
    </button>
    <div class="ticket-pass">
      <div class="qr-mini" data-qr="${esc(r.code)}"></div>
      <div class="grow">
        <span class="pass-label">${reserved ? 'Pickup code' : 'Return code'}</span>
        <div class="pass-code">${esc(r.code)}</div>
        <p class="sub">${reserved ? 'Show this at the desk to pick up.' : 'Show this at the desk to return.'}</p>
      </div>
    </div>
    <div class="ticket-foot">
      <span class="pass-label" data-timer-label>${reserved ? 'Hold expires in' : 'Time left'}</span>
      <strong class="timer" data-${reserved ? 'hold' : 'due'}="${reserved ? r.hold_until : r.due_at}" role="timer"></strong>
    </div>
    ${reserved ? btn({ label: 'Cancel reservation', variant: 'danger', block: true, attrs: `data-cancel="${r.id}"` }) : ''}
  </article>`;
}

export default function rentals({ query }) {
  const el = screenEl(`${topbar({ title: 'My Rentals', back: false })}<div class="content" id="body"></div>`);
  let tab = TABS.some((t) => t.id === query.tab) ? query.tab : 'active';

  loadInto($('#body', el), listMyRentals, (all, b, reload) => {
    b.innerHTML = `
      <div class="segments" role="tablist" aria-label="Rental groups">
        ${TABS.map((t) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel" aria-selected="${t.id === tab}" data-tab="${t.id}">${t.label}<span class="n">${all.filter(t.match).length}</span></button>`).join('')}
      </div>
      <div id="panel" role="tabpanel" class="list"></div>`;
    let stops = [];
    const panel = $('#panel', b);

    function draw() {
      stops.forEach((s) => s());
      stops = [];
      panel.setAttribute('aria-labelledby', `tab-${tab}`);
      const def = TABS.find((t) => t.id === tab);
      const list = all.filter(def.match);
      if (!list.length) {
        const msg = {
          active: ['No active rentals', 'When staff hand you an item it will show here.', { label: 'Browse items', nav: '/borrower/browse' }],
          reserved: ['Nothing reserved', 'Reserve an item and it will be held for you.', { label: 'Browse items', nav: '/borrower/browse' }],
          history: ['No history yet', 'Your past rentals will show up here.', { label: 'Browse items', nav: '/borrower/browse' }],
        }[tab];
        panel.innerHTML = emptyState({ title: msg[0], text: msg[1], action: msg[2] });
        return;
      }
      panel.innerHTML = tab === 'history' ? list.map((r) => rentalRow(r, `/borrower/rental/${r.id}`)).join('') : list.map(openCard).join('');
      $$('[data-qr]', panel).forEach((n) => renderQr(n, n.dataset.qr));
      // Countdowns: flip the label when a due time passes or a hold runs out.
      $$('[data-due]', panel).forEach((n) => {
        const label = n.closest('.ticket-foot')?.querySelector('[data-timer-label]');
        stops.push(tick(n, () => {
          const ms = new Date(n.dataset.due) - Date.now();
          if (label) label.textContent = ms > 0 ? 'Time left' : 'Late by';
          n.textContent = clock(Math.abs(ms));
        }));
      });
      $$('[data-hold]', panel).forEach((n) => {
        const label = n.closest('.ticket-foot')?.querySelector('[data-timer-label]');
        stops.push(tick(n, () => {
          const ms = new Date(n.dataset.hold) - Date.now();
          if (label) label.textContent = ms > 0 ? 'Hold expires in' : 'Hold expired';
          n.textContent = clock(Math.max(0, ms));
        }));
      });
      $$('[data-cancel]', panel).forEach((c) => c.addEventListener('click', async () => {
        if (!(await confirmDialog({ title: 'Cancel this reservation?', message: 'The item goes back on the shelf.', confirmLabel: 'Yes, cancel', cancelLabel: 'Keep it', danger: true }))) return;
        const { error } = await cancel(c.dataset.cancel);
        if (error) return toast(error.message, 'error');
        toast('Reservation cancelled.', 'info');
        reload();
      }));
      staggerIn(panel);
    }
    onLeave(() => stops.forEach((s) => s()));

    $$('[data-tab]', b).forEach((t) => t.addEventListener('click', () => {
      tab = t.dataset.tab;
      $$('[data-tab]', b).forEach((x) => x.setAttribute('aria-selected', String(x === t)));
      draw();
    }));
    draw();
  });
  return el;
}
