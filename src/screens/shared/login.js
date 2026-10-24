import { navigate } from '../../router.js';
import { logIn } from '../../services/auth.service.js';
import { setUser, homeFor } from '../../state.js';
import logo from '../../assets/logo.png';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { btn, iconBtn } from '../../components/button.js';
import { starShape } from '../../components/icons.js';
import { caseStars } from '../../components/card.js';
import { field, bindPasswordToggles, showErrors, liveClear, formError, formData } from '../../components/input.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function loginScreen() {
  const el = screenEl(`
    <div class="content auth auth-v2">
      <header class="auth-hero display-case">
        ${caseStars()}
        <div class="auth-hero-top">
          ${iconBtn({ ic: 'back', label: 'Go back', back: true })}
        </div>
        <img src="${logo}" alt="" aria-hidden="true" class="auth-logo" />
        <h1 tabindex="-1">Welcome back</h1>
        <p class="auth-hero-sub">Log in to borrow, track and return supplies.</p>
      </header>
      <div class="auth-panel">
        <form class="form" id="form" novalidate>
          ${field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'name@tip.edu.ph' })}
          ${field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password' })}
          ${btn({ label: 'Log In', type: 'submit', block: true, id: 'submit' })}
          <div class="divider-star" aria-hidden="true">${starShape(14)}</div>
          <p class="center sub">New here? <a href="#/signup">Create an account</a></p>
        </form>
      </div>
    </div>`);

  bindPasswordToggles(el);
  liveClear(el);

  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const v = formData(ev.currentTarget);
    const errors = {};
    if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Enter your email address.';
    if (!v.password) errors.password = 'Enter your password.';
    showErrors(el, errors);
    if (Object.keys(errors).length) return;
    const { data, error } = await withLoading($('#submit', el), () => logIn(v));
    if (error) {
      if (error.code === 'unverified') return navigate(`/verify?send=1&email=${encodeURIComponent(v.email.trim().toLowerCase())}`);
      return formError(el, error.message);
    }
    setUser(data);
    navigate(homeFor(data.role), { replace: true, reset: true });
  });
  return el;
}
