import { navigate } from '../../router.js';
import { setUser, homeFor } from '../../state.js';
import { signUp, validatePassword, isSchoolEmail } from '../../services/auth.service.js';
import logo from '../../assets/logo.png';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { btn, iconBtn } from '../../components/button.js';
import { caseStars } from '../../components/card.js';
import { field, bindPasswordToggles, bindPasswordRules, passwordRules, setError, showErrors, liveClear, formError, formData } from '../../components/input.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignUp(v, agreed) {
  const e = {};
  if (v.full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
  if (!/^\d{6,10}$/.test(v.student_id.trim())) e.student_id = 'Student ID should be 6 to 10 numbers.';
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email, like name@tip.edu.ph.';
  else if (!isSchoolEmail(v.email)) e.email = 'Only school emails are allowed (name@tip.edu.ph).';
  if (!validatePassword(v.password)) e.password = 'Use at least 8 characters with a letter and a number.';
  if (v.confirm !== v.password) e.confirm = 'The passwords do not match.';
  if (!agreed) e.terms = 'Please agree to the Terms and Borrowing Rules.';
  return e;
}

export default function signupScreen() {
  const el = screenEl(`
    <div class="content auth auth-v2 signup">
      <header class="auth-hero display-case">
        ${caseStars()}
        <div class="auth-hero-top">${iconBtn({ ic: 'back', label: 'Go back', back: true })}</div>
        <img src="${logo}" alt="" aria-hidden="true" class="auth-logo" />
        <h1 tabindex="-1">Create your account</h1>
        <p class="auth-hero-sub">Sign up with your school email to start borrowing.</p>
      </header>
      <div class="auth-panel">
      <form class="form" id="form" novalidate>
        <div class="two">
          ${field({ name: 'full_name', label: 'Full name', autocomplete: 'name', placeholder: 'Ana Reyes' })}
          ${field({ name: 'student_id', label: 'Student ID', inputmode: 'numeric', placeholder: '2310456' })}
        </div>
        ${field({ name: 'email', label: 'School email', type: 'email', autocomplete: 'email', placeholder: 'name@tip.edu.ph' })}
        ${field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' })}
        ${field({ name: 'confirm', label: 'Confirm password', type: 'password', autocomplete: 'new-password' })}
        ${passwordRules()}
        <div class="field" data-field="terms">
          <div class="check">
            <input type="checkbox" id="f-terms" name="terms" aria-describedby="e-terms" />
            <label for="f-terms">I agree to the <a href="#/rules">Terms and Borrowing Rules</a>.</label>
          </div>
          <p class="field-error" id="e-terms" hidden></p>
        </div>
        ${btn({ label: 'Create Account', type: 'submit', block: true, id: 'submit' })}
        <p class="center sub">Already have an account? <a href="#/login">Log in</a></p>
      </form>
      </div>
    </div>`);

  const form = $('#form', el);
  bindPasswordToggles(el);
  liveClear(el);
  $('#f-terms', el).addEventListener('change', () => setError(el, 'terms', ''));

  // Live password checklist: lights up as each rule is met.
  bindPasswordRules(el, $('#f-password', el));

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const v = formData(form);
    const errors = validateSignUp(v, $('#f-terms', el).checked);
    showErrors(el, errors);
    if (Object.keys(errors).length) return;
    const { data, error } = await withLoading($('#submit', el), () => signUp(v));
    if (error) {
      if (error.code === 'email_taken' || error.code === 'bad_email') return showErrors(el, { email: error.message });
      if (error.code === 'id_taken') return showErrors(el, { student_id: error.message });
      return formError(el, error.message);
    }
    if (data.profile) {
      setUser(data.profile);
      return navigate(homeFor(data.profile.role), { replace: true, reset: true });
    }
    navigate(`/verify?email=${encodeURIComponent(data.email)}`);
  });
  return el;
}
