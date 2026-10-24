import { changePassword, validatePassword } from '../../services/auth.service.js';
import { back } from '../../router.js';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { field, bindPasswordToggles, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { toast } from '../../components/toast.js';

export default function changePasswordScreen() {
  const el = screenEl(`
    ${topbar({ title: 'Change Password' })}
    <div class="content">
      <form class="form" id="form" novalidate>
        ${field({ name: 'current', label: 'Current password', type: 'password', autocomplete: 'current-password' })}
        ${field({ name: 'next', label: 'New password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters, with a letter and a number.' })}
        ${field({ name: 'confirm', label: 'Confirm new password', type: 'password', autocomplete: 'new-password' })}
        ${btn({ label: 'Update password', type: 'submit', block: true, id: 'submit' })}
      </form>
    </div>`);
  bindPasswordToggles(el);
  liveClear(el);
  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const v = formData(ev.currentTarget);
    const errors = {};
    if (!v.current) errors.current = 'Enter your current password.';
    if (!validatePassword(v.next)) errors.next = 'Use at least 8 characters with a letter and a number.';
    if (v.confirm !== v.next) errors.confirm = 'The passwords do not match.';
    showErrors(el, errors);
    if (Object.keys(errors).length) return;
    const { error } = await withLoading($('#submit', el), () => changePassword(v));
    if (error) return error.code === 'bad_password' ? showErrors(el, { current: error.message }) : formError(el, error.message);
    toast('Password updated.');
    back();
  });
  return el;
}
