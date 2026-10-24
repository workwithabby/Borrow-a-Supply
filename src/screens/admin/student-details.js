import { getProfile, suspendUser, restoreUser } from '../../services/people.service.js';
import { listAllRentals } from '../../services/rentals.service.js';
import { screenEl, esc, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { rentalRow } from '../../components/card.js';
import { emptyState } from '../../components/empty-state.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { openResetPasswordSheet } from '../../components/reset-password-sheet.js';
import { loadInto, loadAll } from '../../components/load.js';

export default function studentDetails({ params }) {
  const el = screenEl(`${topbar({ title: 'Student' })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), () => loadAll(getProfile(params.id), listAllRentals()), ([p, all], b, reload) => {
    const mine = all.filter((r) => r.user_id === p.id);
    const suspended = p.status === 'suspended';
    const open = mine.filter((r) => r.status === 'reserved' || r.status === 'active' || r.status === 'overdue').length;
    b.innerHTML = `
      <div class="card">
        <div class="row"><div class="grow"><h2>${esc(p.full_name)}</h2><p class="sub">ID ${esc(p.student_id)}</p>
        ${p.program ? `<p class="sub">${esc(p.program)}</p>` : ''}<p class="sub">${esc(p.email)}</p></div>
        <span class="chip ${suspended ? 'chip-overdue' : 'chip-returned'}">${suspended ? 'Suspended' : 'Active'}</span></div>
      </div>
      <div class="stats">
        <div class="card stat"><div class="num">${mine.length}</div><div class="sub">Total rentals</div></div>
        <div class="card stat"><div class="num">${open}</div><div class="sub">Open now</div></div>
      </div>
      <section aria-labelledby="h-h"><h2 id="h-h" class="sec">Rental history</h2>
        ${mine.length ? `<div class="list">${mine.map((r) => rentalRow(r, `/admin/rental/${r.id}`)).join('')}</div>` : emptyState({ title: 'No rentals yet', text: 'This student has not borrowed anything.' })}
      </section>
      ${btn({ label: 'Reset password', variant: 'outline', ic: 'lock', block: true, id: 'reset' })}
      ${btn({ label: suspended ? 'Restore account' : 'Suspend account', variant: suspended ? 'secondary' : 'danger', block: true, id: 'toggle' })}`;
    $('#reset', b).addEventListener('click', () => openResetPasswordSheet(p));
    $('#toggle', b).addEventListener('click', async () => {
      if (!suspended && !(await confirmDialog({ title: `Suspend ${p.full_name}?`, message: 'They will not be able to log in until you restore the account.', confirmLabel: 'Suspend' }))) return;
      const { error } = await (suspended ? restoreUser(p.id) : suspendUser(p.id));
      if (error) return toast(error.message, 'error');
      toast(suspended ? 'Account restored.' : 'Account suspended.', 'info');
      reload();
    });
  });
  return el;
}
