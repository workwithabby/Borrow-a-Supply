import { findByCode, listAllRentals } from '../../services/rentals.service.js';
import { navigate } from '../../router.js';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn, linkBtn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { field, showErrors, liveClear, formError } from '../../components/input.js';

// Camera scanning comes with the Capacitor build (see CAPACITOR.md).
// For now staff can type a code, or use the demo scan button.
export default function scan() {
  const el = screenEl(`
    ${topbar({ title: 'Scan', back: false })}
    <div class="content">
      <div class="scan-stage">
        <div class="scan-frame" aria-hidden="true">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          ${icon('qr', 64)}
          <span class="scan-line"></span>
        </div>
        <p class="sub center">Line the student's QR code up with the frame. Camera scanning arrives with the phone build.</p>
      </div>
      ${btn({ label: 'Demo scan', ic: 'scan', variant: 'secondary', block: true, id: 'fake' })}
      <div class="card">
        <div class="sec-head"><h2 class="sec">Or type a code</h2>${linkBtn('Open queue', '/staff/queue')}</div>
        <form class="form" id="form" novalidate>
          ${field({ name: 'code', label: 'Reservation code', placeholder: 'BAS-4F7K', autocomplete: 'off', hint: 'Codes look like BAS-4F7K. Case does not matter.' })}
          ${btn({ label: 'Find reservation', ic: 'keyboard', type: 'submit', block: true, id: 'submit' })}
        </form>
      </div>
    </div>`);
  liveClear(el);
  $('#f-code', el).classList.add('code-input', 'code-text');

  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const code = $('#f-code', el).value.trim();
    if (!code) return showErrors(el, { code: 'Type the code from the student\'s screen.' });
    showErrors(el, {});
    const { data, error } = await withLoading($('#submit', el), () => findByCode(code));
    if (error) return showErrors(el, { code: error.message });
    navigate(`/staff/reservation/${data.id}`);
  });

  // Picks a random open reservation so the group can test the flow.
  $('#fake', el).addEventListener('click', async (e) => {
    const { data, error } = await withLoading(e.currentTarget, () => listAllRentals({ status: ['reserved', 'active', 'overdue'] }));
    if (error) return formError(el, error.message);
    if (!data.length) return formError(el, 'No open reservations to scan right now.');
    const pick = data[Math.floor(Math.random() * data.length)];
    navigate(`/staff/reservation/${pick.id}`);
  });
  return el;
}
