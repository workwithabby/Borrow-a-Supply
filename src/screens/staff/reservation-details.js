import { getRental, confirmPickup, confirmReturn, lateFeeFor } from '../../services/rentals.service.js';
import { getSettings } from '../../services/settings.service.js';
import { navigate, onLeave } from '../../router.js';
import { screenEl, esc, peso, fmtWhen, clock, tick, withLoading, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { kv, itemBubble } from '../../components/card.js';
import { statusChip } from '../../components/chip.js';
import { timeline } from '../../components/timeline.js';
import { icon } from '../../components/icons.js';
import { loadInto, loadAll } from '../../components/load.js';
import { textareaField } from '../../components/input.js';

export default function reservationDetails({ params }) {
  const el = screenEl(`${topbar({ title: 'Reservation' })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), () => loadAll(getRental(params.id), getSettings()), ([r, s], b) => {
    const isReserved = r.status === 'reserved';
    const isOut = r.status === 'active' || r.status === 'overdue';
    const late = r.status === 'overdue' ? lateFeeFor(r, s) : 0;

    b.innerHTML = `
      <div class="card">
        <div class="row"><div class="grow"><h2>${esc(r.user.full_name)}</h2><p class="sub">ID ${esc(r.user.student_id)}</p></div>${statusChip(r.status, r.late)}</div>
      </div>
      <div class="card">
        <div class="row">${itemBubble(r.item)}
          <div class="grow"><h3>${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}</h3>
          <div class="sub">${r.qty > 1 ? `${r.qty} items` : '1 item'}</div></div></div>
        ${kv('Code', esc(r.code))}
        ${kv('Fee', peso(r.fee))}
        ${kv('Payment', r.paid ? 'Paid' : 'Pay at the room')}
        ${isOut ? kv('Due', fmtWhen(r.due_at)) : ''}
        ${late ? kv('Late fee so far', peso(late)) : ''}
        ${isReserved ? kv('Hold expires', `<span data-hold="${r.hold_until}">${clock(new Date(r.hold_until) - Date.now())}</span>`) : ''}
      </div>
      <div class="card"><h3>Timeline</h3>${timeline(r)}</div>

      ${isReserved ? `<form class="form card" id="pickup">
        <h3>Hand out this item</h3>
        <p class="sub">Check the student ID, collect any payment, then hand over the item.</p>
        ${r.paid ? `<div class="card success">${icon('check', 18)} Already paid with e-wallet.</div>`
          : `<div class="check"><input type="checkbox" id="paid" checked /><label for="paid">I received ${peso(r.fee)} in cash</label></div>`}
        ${btn({ label: 'Confirm Pickup', type: 'submit', block: true, id: 'go' })}
      </form>` : ''}

      ${isOut ? `<form class="form card" id="ret">
        <h3>Check the item</h3>
        <p class="sub">Look over the item together with the student before you confirm.</p>
        <fieldset class="choice"><legend>Condition</legend>
          <label class="opt"><input type="radio" name="condition" value="good" checked /><span>Good</span></label>
          <label class="opt"><input type="radio" name="condition" value="damaged" /><span>Damaged</span></label>
          <label class="opt"><input type="radio" name="condition" value="missing_part" /><span>Missing part</span></label>
        </fieldset>
        ${textareaField({ name: 'note', label: 'Note (optional)', placeholder: 'What is wrong with it?' })}
        ${late ? `<div class="card warn">Collect the late fee: <strong>${peso(late)}</strong></div>` : ''}
        ${btn({ label: 'Confirm Return', type: 'submit', block: true, id: 'go' })}
      </form>` : ''}

      ${!isReserved && !isOut ? '<p class="sub center">No actions needed for this rental.</p>' : ''}`;

    const stops = [];
    b.querySelectorAll('[data-hold]').forEach((n) => stops.push(tick(n, () => {
      const ms = new Date(n.dataset.hold) - Date.now();
      n.textContent = ms > 0 ? clock(ms) : 'now';
    })));
    onLeave(() => stops.forEach((s) => s()));

    $('#pickup', b)?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const paid = r.paid || $('#paid', b).checked;
      if (!paid) {
        b.querySelector('.form-error')?.remove();
        return $('#go', b).insertAdjacentHTML('beforebegin', '<div class="form-error" role="alert">Please collect the payment first.</div>');
      }
      const { error } = await withLoading($('#go', b), () => confirmPickup(r.id, { paid }));
      navigate(`/staff/result/${r.id}?type=pickup${error ? '&error=' + encodeURIComponent(error.message) : ''}`, { replace: true });
    });

    $('#ret', b)?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.currentTarget);
      const { error } = await withLoading($('#go', b), () => confirmReturn(r.id, { condition: fd.get('condition'), note: fd.get('note') || '' }));
      navigate(`/staff/result/${r.id}?type=return${error ? '&error=' + encodeURIComponent(error.message) : ''}`, { replace: true });
    });
  });
  return el;
}
