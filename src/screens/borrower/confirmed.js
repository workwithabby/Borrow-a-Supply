import { getRental } from '../../services/rentals.service.js';
import { onLeave } from '../../router.js';
import { screenEl, esc, clock, tick, $ } from '../../components/ui.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { renderQr } from '../../components/qr.js';
import { caseStars } from '../../components/card.js';
import { loadInto } from '../../components/load.js';
import { getSettings } from '../../services/settings.service.js';

export default function confirmed({ params }) {
  const el = screenEl('<div class="content" id="body"></div>');
  loadInto($('#body', el), () => getRental(params.id), async (r, b) => {
    const { data: s } = await getSettings();
    b.innerHTML = `
      <div class="card success center">
        ${caseStars()}
        <span class="bubble lg tint-mint" style="background:var(--white)">${icon('check', 48)}</span>
        <h1 tabindex="-1">Reservation confirmed</h1>
        <p>${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}</p>
      </div>
      <div class="card center qr-card">
        <div class="qr-box" id="qr"></div>
        <div class="code" aria-label="Reservation code ${esc(r.code.split('').join(' '))}">${esc(r.code)}</div>
      </div>
      <div class="card info center">
        <p>Show this to the staff at the room.</p>
        <p><strong>Hold time: ${s.hold_minutes} minutes</strong></p>
        <p class="hold" id="hold"></p>
      </div>
      <div class="form">
        ${btn({ label: 'View My Rentals', nav: '/borrower/rentals?tab=reserved', block: true })}
        ${btn({ label: 'Back to Home', nav: '/borrower/home', variant: 'outline', block: true })}
      </div>`;
    renderQr($('#qr', b), r.code);
    const hold = $('#hold', b);
    const stop = tick(hold, () => {
      const ms = new Date(r.hold_until) - Date.now();
      hold.textContent = ms > 0 ? `Time left: ${clock(ms)}` : 'The hold time is over.';
    });
    onLeave(stop);
  });
  return el;
}
