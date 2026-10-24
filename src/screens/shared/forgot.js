import { navigate } from '../../router.js';
import { forgotPassword, resetPassword, validatePassword } from '../../services/auth.service.js';
import logo from '../../assets/logo.png';
import { screenEl, withLoading, esc, $ } from '../../components/ui.js';
import { btn, iconBtn } from '../../components/button.js';
import { field, bindPasswordToggles, bindPasswordRules, passwordRules, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { toast } from '../../components/toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Three steps on one screen: email, code and new password, done.
export default function forgotScreen() {
  const el = screenEl(`
    <div class="content auth">
      <div class="brand-bar">
        ${iconBtn({ ic: 'back', label: 'Go back', back: true })}
        <img src="${logo}" alt="" aria-hidden="true" class="brand-mark" />
        <span class="brand-wordmark grow">Borrow-a-Supply</span>
      </div>
      <div class="auth-step" id="step"></div>
    </div>`);
  const step = $('#step', el);
  let email = '';

  function stepEmail() {
    step.innerHTML = `
      <div class="auth-intro">
        <h1 tabindex="-1">Reset your password</h1>
        <p class="sub">Enter your school email and we will send you a code.</p>
      </div>
      <form class="form" id="form" novalidate>
        ${field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'name@tip.edu.ph' })}
        ${btn({ label: 'Send code', type: 'submit', block: true, id: 'submit' })}
      </form>`;
    liveClear(step);
    $('#form', step).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = formData(ev.currentTarget);
      if (!EMAIL_RE.test(v.email.trim())) return showErrors(step, { email: 'Enter a valid email address.' });
      showErrors(step, {});
      const { data, error } = await withLoading($('#submit', step), () => forgotPassword(v));
      if (error) return formError(step, error.message);
      email = data.email;
      stepReset();
    });
  }

  function stepReset() {
    step.innerHTML = `
      <div class="auth-intro">
        <h1 tabindex="-1">Check your email</h1>
        <p class="sub">If <strong>${esc(email)}</strong> has an account, a code is on its way.</p>
      </div>
      <form class="form" id="form" novalidate>
        ${field({ name: 'code', label: '6-digit code', inputmode: 'numeric', maxlength: 6, autocomplete: 'one-time-code', hint: 'Check your inbox and spam folder.' })}
        ${field({ name: 'password', label: 'New password', type: 'password', autocomplete: 'new-password' })}
        ${passwordRules()}
        ${field({ name: 'confirm', label: 'Confirm new password', type: 'password', autocomplete: 'new-password' })}
        ${btn({ label: 'Set new password', type: 'submit', block: true, id: 'submit' })}
      </form>`;
    $('#f-code', step).classList.add('code-input');
    bindPasswordToggles(step);
    bindPasswordRules(step, $('#f-password', step));
    liveClear(step);
    $('h1', step)?.focus({ preventScroll: true });
    $('#form', step).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = formData(ev.currentTarget);
      const errors = {};
      if (!/^\d{6}$/.test(v.code.trim())) errors.code = 'Enter the 6 numbers from your email.';
      if (!validatePassword(v.password)) errors.password = 'Use at least 8 characters with a letter and a number.';
      if (v.confirm !== v.password) errors.confirm = 'The passwords do not match.';
      showErrors(step, errors);
      if (Object.keys(errors).length) return;
      const { error } = await withLoading($('#submit', step), () => resetPassword({ email, code: v.code.trim(), password: v.password }));
      if (error) return error.code === 'weak_password' ? showErrors(step, { password: error.message }) : showErrors(step, { code: error.message });
      toast('Password updated. Please log in.');
      navigate('/login', { replace: true, reset: true });
    });
  }

  stepEmail();
  return el;
}
