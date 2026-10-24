import { navigate, onLeave } from '../../router.js';
import { verifyEmail, resendCode } from '../../services/auth.service.js';
import { setUser, homeFor } from '../../state.js';
import logo from '../../assets/logo.png';
import { screenEl, withLoading, esc, $ } from '../../components/ui.js';
import { btn, iconBtn } from '../../components/button.js';
import { field, showErrors, liveClear, formError } from '../../components/input.js';
import { toast } from '../../components/toast.js';

const WAIT = 30; // seconds before the code can be sent again

export default function verifyScreen({ query }) {
  const email = query.email || '';
  const el = screenEl(`
    <div class="content auth">
      <div class="brand-bar">
        ${iconBtn({ ic: 'back', label: 'Go back', back: true })}
        <img src="${logo}" alt="" aria-hidden="true" class="brand-mark" />
        <span class="brand-wordmark grow">Borrow-a-Supply</span>
      </div>
      <div class="auth-intro">
        <h1 tabindex="-1">Verify your email</h1>
        <p class="sub">We sent a 6-digit code to <strong>${esc(email) || 'your email'}</strong>.</p>
      </div>
      <form class="form" id="form" novalidate>
        ${field({ name: 'code', label: '6-digit code', inputmode: 'numeric', maxlength: 6, autocomplete: 'one-time-code', placeholder: '123456', hint: 'Check your inbox and spam folder.' })}
        <div id="ok" class="card success" role="status" hidden><strong>Email verified.</strong> Taking you home.</div>
        ${btn({ label: 'Verify', type: 'submit', block: true, id: 'submit' })}
        ${btn({ label: `Resend code (${WAIT}s)`, variant: 'ghost', block: true, id: 'resend', disabled: true })}
      </form>
    </div>`);

  const resend = $('#resend', el);
  let left = WAIT;
  const label = () => (resend.firstElementChild.textContent = left > 0 ? `Resend code (${left}s)` : 'Resend code');
  const timer = setInterval(() => {
    left -= 1;
    if (left <= 0) { clearInterval(timer); resend.disabled = false; }
    label();
  }, 1000);
  onLeave(() => clearInterval(timer));

  $('#f-code', el).classList.add('code-input');
  // Coming from a login that was not verified yet: send a fresh code.
  if (query.send) resendCode({ email });
  liveClear(el);

  resend.addEventListener('click', async () => {
    resend.disabled = true;
    const { error } = await resendCode({ email });
    if (error) { resend.disabled = false; return toast(error.message, 'error'); }
    toast('A new code is on its way.', 'info');
    left = WAIT;
    label();
    const t2 = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(t2); resend.disabled = false; }
      if (!resend.isConnected) clearInterval(t2);
      label();
    }, 1000);
    onLeave(() => clearInterval(t2));
  });

  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const code = $('#f-code', el).value.trim();
    if (!/^\d{6}$/.test(code)) return showErrors(el, { code: 'Enter the 6 numbers from your email.' });
    showErrors(el, {});
    const { data, error } = await withLoading($('#submit', el), () => verifyEmail({ email, code }));
    if (error) return showErrors(el, { code: error.message });
    setUser(data);
    $('#ok', el).hidden = false;
    setTimeout(() => navigate(homeFor(data.role), { replace: true, reset: true }), 900);
  });
  return el;
}
