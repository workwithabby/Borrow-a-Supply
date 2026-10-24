import { resetUserPassword } from '../services/people.service.js';
import { validatePassword } from '../services/auth.service.js';
import { openSheet } from './sheet.js';
import { btn } from './button.js';
import { esc, withLoading, $ } from './ui.js';
import { field, bindPasswordToggles, showErrors, liveClear, formError, formData } from './input.js';
import { toast } from './toast.js';

// Admin sets a new password for someone who forgot theirs, then tells them in person.
export function openResetPasswordSheet(person) {
  openSheet({
    title: 'Reset password',
    body: `<p class="sub">Set a new password for <strong>${esc(person.full_name)}</strong>. They will be logged out and can log in with this password. Ask them to change it from Profile.</p>
      <form class="form" id="reset-form" novalidate>
        ${field({ name: 'password', label: 'New password', type: 'password', autocomplete: 'new-password', hint: 'At least 8 characters with a letter and a number.' })}
        ${btn({ label: 'Set new password', type: 'submit', block: true, id: 'reset-go' })}
      </form>`,
    onMount(sh, close) {
      const form = $('#reset-form', sh);
      bindPasswordToggles(sh);
      liveClear(sh);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        formError(sh, '');
        const { password } = formData(form);
        if (!validatePassword(password)) return showErrors(sh, { password: 'Use at least 8 characters with a letter and a number.' });
        showErrors(sh, {});
        const { error } = await withLoading($('#reset-go', sh), () => resetUserPassword(person.id, password));
        if (error) return formError(sh, error.message);
        close();
        toast('Password reset.');
      });
    },
  });
}
