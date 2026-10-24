import { addStaff } from '../../services/people.service.js';
import { validatePassword, isSchoolEmail } from '../../services/auth.service.js';
import { back } from '../../router.js';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { shiftPicker, bindShiftPicker } from '../../components/shift-picker.js';
import { field, bindPasswordToggles, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { toast } from '../../components/toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function addStaffScreen() {
  const el = screenEl(`
    ${topbar({ title: 'Add Staff' })}
    <div class="content">
      <p class="lead">Create a staff account. Share the email and password with them. They can change the password later from Profile.</p>
      <form class="form card set-card" id="form" novalidate>
        ${field({ name: 'full_name', label: 'Full name', autocomplete: 'off' })}
        ${field({ name: 'email', label: 'School email', type: 'email', autocomplete: 'off', placeholder: 'name@tip.edu.ph' })}
        ${field({ name: 'password', label: 'Starting password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters with a letter and a number.' })}
        ${shiftPicker()}
        ${btn({ label: 'Add staff', type: 'submit', block: true, id: 'submit' })}
      </form>
    </div>`);
  liveClear(el);
  bindPasswordToggles(el);
  const shift = bindShiftPicker(el);

  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const v = formData(ev.currentTarget);
    const errors = {};
    if (v.full_name.trim().length < 2) errors.full_name = 'Please enter their full name.';
    if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Enter a valid email address.';
    else if (!isSchoolEmail(v.email)) errors.email = 'Use a school email (name@tip.edu.ph).';
    if (!validatePassword(v.password)) errors.password = 'Use at least 8 characters with a letter and a number.';
    showErrors(el, errors);
    const shiftOk = shift.valid();
    if (Object.keys(errors).length || !shiftOk) return;
    const { error } = await withLoading($('#submit', el), () => addStaff({ ...v, shift: shift.value() }));
    if (error) return error.code === 'email_taken' ? showErrors(el, { email: error.message }) : formError(el, error.message);
    toast('Staff added.');
    back();
  });
  return el;
}
