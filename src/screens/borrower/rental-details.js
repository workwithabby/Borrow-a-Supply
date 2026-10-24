import { getRental, cancel, lateFeeFor } from '../../services/rentals.service.js';
import { getSettings } from '../../services/settings.service.js';
import { onLeave } from '../../router.js';
import { state } from '../../state.js';
import { screenEl, esc, peso, fmtWhen, clock, tick, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { kv } from '../../components/card.js';
import { statusChip } from '../../components/chip.js';
import { timeline } from '../../components/timeline.js';
import { renderQr } from '../../components/qr.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto, loadAll } from '../../components/load.js';

const COND = { good: 'Good', damaged: 'Damaged', missing_part: 'Missing part' };

export default function rentalDetails({ params }) {
  const el = screenEl(`${topbar({ title: 'Rental Details' })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), () => loadAll(getRental(params.id), getSettings()), ([r, s], b, reload) => {
    const open = ['reserved', 'active', 'overdue'].includes(r.status);
    const late = r.status === 'overdue' ? lateFeeFor(r, s) : r.late_fee;
    b.innerHTML = `
      <div class="card">
        <div class="row"><div class="grow"><h2>${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}</h2>
        <p class="sub">${r.code}</p></div>${statusChip(r.status, r.late)}</div>
        ${open ? '<div class="timer big" id="timer" role="timer"></div>' : ''}
      </div>
      ${open ? `<div class="card center qr-card"><div class="qr-box" id="qr"></div><div class="code">${esc(r.code)}</div>
        <p class="sub">${r.status === 'reserved' ? 'Show this at the room to pick up.' : 'Show this to return the item.'}</p></div>` : ''}
      <div class="card"><h3>Timeline</h3>${timeline(r)}</div>
      <div class="card">
        <h3>Payment</h3>
        ${kv('Fee', peso(r.fee))}
        ${late ? kv(r.status === 'overdue' ? 'Late fee so far' : 'Late fee', peso(late)) : ''}
        ${kv('Paid', r.paid ? 'Yes' : 'At the room')}
        ${kv('Sessions', `${r.sessions} (${r.sessions * 2} hours)`)}
        ${r.due_at && !['cancelled', 'expired'].includes(r.status) ? kv('Due', fmtWhen(r.due_at)) : ''}
      </div>
      ${r.condition || r.note ? `<div class="card"><h3>Notes</h3>
        ${r.condition ? kv('Condition on return', COND[r.condition]) : ''}
        ${r.note ? `<p>${esc(r.note)}</p>` : ''}</div>` : ''}
      ${r.status === 'reserved' && state.user.role === 'user' ? btn({ label: 'Cancel reservation', variant: 'danger', block: true, id: 'cancel' }) : ''}`;

    if (open) {
      renderQr($('#qr', b), r.code);
      const t = $('#timer', b);
      const stop = tick(t, () => {
        if (r.status === 'reserved') {
          const ms = new Date(r.hold_until) - Date.now();
          t.textContent = ms > 0 ? `Pick up within ${clock(ms)}` : 'Hold time is over';
        } else {
          const ms = new Date(r.due_at) - Date.now();
          t.textContent = ms > 0 ? `${clock(ms)} left` : `Late by ${clock(-ms)}`;
        }
      });
      onLeave(stop);
    }
    $('#cancel', b)?.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Cancel this reservation?', message: 'The item goes back on the shelf.', confirmLabel: 'Yes, cancel', cancelLabel: 'Keep it' }))) return;
      const { error } = await cancel(r.id);
      if (error) return toast(error.message, 'error');
      toast('Reservation cancelled.', 'info');
      reload();
    });
  });
  return el;
}
