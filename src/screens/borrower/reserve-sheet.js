import { reserve } from '../../services/rentals.service.js';
import { SESSION_MINUTES } from '../../services/rentals.service.js';
import { navigate } from '../../router.js';
import { openSheet } from '../../components/sheet.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { esc, peso, fmtTime, withLoading, $, $$ } from '../../components/ui.js';
import { toast } from '../../components/toast.js';

// Steps: quantity, sessions, summary, pay method, confirm.
export function openReserveSheet(item, settings) {
  const maxQty = Math.max(1, Math.min(item.available_stock, 3));
  const st = { qty: 1, sessions: 1, pay: 'cash' };

  const body = `
    <div class="field">
      <span class="lbl" id="qty-l">Quantity</span>
      <div class="stepper" role="group" aria-labelledby="qty-l">
        <button type="button" class="icon-btn" id="dec" aria-label="Fewer">${icon('minus', 20)}</button>
        <span class="num" id="qty" aria-live="polite">1</span>
        <button type="button" class="icon-btn" id="inc" aria-label="More">${icon('plus', 20)}</button>
      </div>
    </div>
    <fieldset class="choice">
      <legend>Session</legend>
      <label class="opt"><input type="radio" name="sessions" value="1" checked /><span>1 session (2 hours)</span></label>
      <label class="opt"><input type="radio" name="sessions" value="2" /><span>2 sessions (4 hours)</span></label>
    </fieldset>
    <div class="card info" id="summary" aria-live="polite"></div>
    <fieldset class="choice">
      <legend>How will you pay?</legend>
      <label class="opt"><input type="radio" name="pay" value="cash" checked />${icon('cash', 20)}<span>Pay at the room (cash)</span></label>
      <label class="opt"><input type="radio" name="pay" value="ewallet" />${icon('wallet', 20)}<span>E-wallet (demo)</span></label>
    </fieldset>
    <div id="err" class="form-error" role="alert" hidden></div>
    ${btn({ label: 'Confirm Reservation', block: true, id: 'confirm' })}`;

  openSheet({
    title: `Reserve ${item.name}`,
    body,
    onMount(el, close) {
      const draw = () => {
        const total = item.fee * st.qty * st.sessions;
        const due = new Date(Date.now() + (settings.hold_minutes + st.sessions * SESSION_MINUTES) * 60000);
        $('#qty', el).textContent = st.qty;
        $('#dec', el).disabled = st.qty <= 1;
        $('#inc', el).disabled = st.qty >= maxQty;
        $('#summary', el).innerHTML = `
          <div class="row"><span class="grow">${esc(item.name)} x${st.qty}</span></div>
          <div class="row"><span class="grow">Fee</span><strong>${peso(total)}</strong></div>
          <div class="row"><span class="grow">Pick up within</span><strong>${settings.hold_minutes} min</strong></div>
          <div class="row"><span class="grow">Due by about</span><strong>${fmtTime(due)}</strong></div>`;
      };
      $('#dec', el).addEventListener('click', () => { st.qty -= 1; draw(); });
      $('#inc', el).addEventListener('click', () => { st.qty += 1; draw(); });
      $$('[name=sessions]', el).forEach((r) => r.addEventListener('change', () => { st.sessions = Number(r.value); draw(); }));
      $$('[name=pay]', el).forEach((r) => r.addEventListener('change', () => { st.pay = r.value; }));
      draw();

      $('#confirm', el).addEventListener('click', async (e) => {
        const err = $('#err', el);
        err.hidden = true;
        const { data, error } = await withLoading(e.currentTarget, () => reserve({ item_id: item.id, qty: st.qty, sessions: st.sessions, pay_method: st.pay }));
        if (error) {
          err.textContent = error.message;
          err.hidden = false;
          return;
        }
        close();
        toast('Reservation confirmed.');
        navigate(`/borrower/confirmed/${data.id}`, { replace: true });
      });
    },
  });
}
