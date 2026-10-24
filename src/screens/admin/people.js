import { listStudents, listStaff, removeStaff, changeRole, updateShift } from '../../services/people.service.js';
import { state } from '../../state.js';
import { screenEl, esc, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { bubble } from '../../components/card.js';
import { emptyState } from '../../components/empty-state.js';
import { openSheet } from '../../components/sheet.js';
import { openResetPasswordSheet } from '../../components/reset-password-sheet.js';
import { shiftPicker, bindShiftPicker } from '../../components/shift-picker.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto, loadAll } from '../../components/load.js';

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const PALETTE = ['pink', 'sky', 'yellow', 'mint', 'purple'];
const tintOf = (n = '') => PALETTE[[...n].reduce((h, c) => h + c.charCodeAt(0), 0) % PALETTE.length];
const av = (name, extra = '', photo = '') => `<span class="pavatar tint-${tintOf(name)} ${extra}" aria-hidden="true">${photo ? `<img src="${esc(photo)}" alt="" />` : esc(initials(name))}</span>`;

const studentRow = (p) => `<li><button type="button" class="prow" data-nav="/admin/student/${p.id}">
  ${av(p.full_name, p.status === 'suspended' ? 'dim' : '')}
  <span class="grow"><span class="title">${esc(p.full_name)}</span><span class="sub">ID ${esc(p.student_id)}</span></span>
  ${p.status === 'suspended' ? '<span class="chip chip-overdue">Suspended</span>' : ''}${icon('next', 18)}</button></li>`;

const staffRow = (p) => `<article class="card staff-card" aria-label="${esc(p.full_name)}">
  <div class="row">${av(p.full_name, p.on_duty ? 'live' : '', p.avatar)}
  <div class="grow"><div class="title">${esc(p.full_name)}</div><div class="sub">${esc(p.shift || 'No shift set')}</div></div>
  <div class="chips">${p.id === state.user?.id ? '<span class="chip chip-pink">You</span>' : ''}${p.role === 'admin' ? '<span class="chip chip-active">Admin</span>' : '<span class="chip chip-muted">Staff</span>'}${p.on_duty ? '<span class="chip chip-returned">On duty</span>' : ''}</div></div>
  <div class="staff-foot"><span class="staff-mail">${icon('mail', 16)}<span>${esc(p.email)}</span></span>
  <button type="button" class="btn btn-outline btn-sm" data-manage="${p.id}">Manage</button></div></article>`;

export default function people() {
  const el = screenEl(`${topbar({ title: 'People', back: false })}<div class="content" id="body"></div>`);
  let seg = 'students';
  let q = '';
  let prog = '';

  loadInto($('#body', el), () => loadAll(listStudents(), listStaff()), ([students, staff], b, reload) => {
    const programOf = (p) => p.program || 'Unassigned';
    const programs = [...new Set(students.map(programOf))].sort((a, c) => a.localeCompare(c));
    if (prog && !programs.includes(prog)) prog = '';

    b.innerHTML = `
      <div class="segments" role="tablist" aria-label="People">
        <button type="button" role="tab" aria-selected="true" data-seg="students">Students<span class="n">${students.length}</span></button>
        <button type="button" role="tab" aria-selected="false" data-seg="staff">Staff<span class="n">${staff.length}</span></button>
      </div>
      <div class="search" role="search">${icon('search', 20)}<label class="sr-only" for="q">Search people</label>
        <input id="q" class="input" type="search" placeholder="Search name or student ID" autocomplete="off" /></div>
      <div class="hscroll filter-row" id="progs" role="group" aria-label="Filter by program">
        <button type="button" class="filter-chip" data-prog="" aria-pressed="true">All<span class="n">${students.length}</span></button>
        ${programs.map((name) => `<button type="button" class="filter-chip" data-prog="${esc(name)}" aria-pressed="false">${esc(name)}<span class="n">${students.filter((p) => programOf(p) === name).length}</span></button>`).join('')}
      </div>
      <div id="list" class="list" role="tabpanel"></div>
      <button type="button" class="fab" id="fab" data-nav="/admin/staff/new" aria-label="Add staff" hidden>${icon('plus', 26)}<span>Add staff</span></button>`;
    const list = $('#list', b);

    function draw() {
      const isStudents = seg === 'students';
      $('#q', b).placeholder = isStudents ? 'Search name or student ID' : 'Search name or email';
      $('#progs', b).hidden = !isStudents;
      $('#fab', b).hidden = isStudents;
      if (isStudents) {
        const shown = students
          .filter((p) => !prog || programOf(p) === prog)
          .filter((p) => !q || p.full_name.toLowerCase().includes(q) || p.student_id.includes(q))
          .sort((a, c) => a.full_name.localeCompare(c.full_name));
        const groups = new Map();
        shown.forEach((p) => {
          const key = programOf(p);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(p);
        });
        list.innerHTML = shown.length
          ? [...groups.entries()].map(([name, rows]) => `
            <section class="group" aria-label="${esc(name)}">
              <h3 class="group-h">${esc(name)}<span class="chip chip-muted">${rows.length}</span></h3>
              <ul class="card plist" role="list">${rows.map(studentRow).join('')}</ul>
            </section>`).join('')
          : emptyState({ title: 'No students found', text: 'Try a different name, ID or program.' });
      } else {
        const shown = staff.filter((p) => !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
        list.innerHTML = shown.length
          ? shown.map(staffRow).join('')
          : emptyState({ title: staff.length ? 'No staff found' : 'No staff yet', text: staff.length ? 'Try a different name or email.' : 'Add a student assistant to run the room.', action: staff.length ? null : { label: 'Add staff', nav: '/admin/staff/new' } });
      }
      staggerIn(list);
    }
    $('#q', b).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
    $$('[data-seg]', b).forEach((s) => s.addEventListener('click', () => {
      seg = s.dataset.seg;
      $$('[data-seg]', b).forEach((x) => x.setAttribute('aria-selected', String(x === s)));
      draw();
    }));
    $$('[data-prog]', b).forEach((c) => c.addEventListener('click', () => {
      prog = c.dataset.prog;
      $$('[data-prog]', b).forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      draw();
    }));

    list.addEventListener('click', (e) => {
      const m = e.target.closest('[data-manage]');
      if (!m) return;
      const p = staff.find((x) => x.id === m.dataset.manage);
      const isMe = p.id === state.user?.id;
      if (isMe) {
        openSheet({
          title: p.full_name,
          body: `<p class="sub">This is your own account. Edit your details and password from Profile.</p>
            ${btn({ label: 'Close', variant: 'outline', block: true, id: 'close-sheet' })}`,
          onMount(sh, close) { $('#close-sheet', sh).addEventListener('click', () => close()); },
        });
        return;
      }
      openSheet({
        title: p.full_name,
        body: `<div class="field"><label for="role">Role</label>
          <select class="select" id="role"><option value="staff" ${p.role === 'staff' ? 'selected' : ''}>Staff</option><option value="admin" ${p.role === 'admin' ? 'selected' : ''}>Admin</option><option value="user" ${p.role === 'user' ? 'selected' : ''}>Student</option></select></div>
          ${shiftPicker(p.shift)}
          ${btn({ label: 'Save changes', block: true, id: 'save' })}
          ${btn({ label: 'Reset password', variant: 'outline', block: true, id: 'reset' })}
          ${btn({ label: 'Remove staff access', variant: 'danger', block: true, id: 'remove' })}`,
        onMount(sh, close) {
          const shift = bindShiftPicker(sh);
          $('#save', sh).addEventListener('click', async () => {
            if (!shift.valid()) return;
            const role = $('#role', sh).value;
            if (shift.value() !== (p.shift || '')) {
              const r = await updateShift(p.id, shift.value());
              if (r.error) return toast(r.error.message, 'error');
            }
            if (role !== p.role) {
              const r = await changeRole(p.id, role);
              if (r.error) return toast(r.error.message, 'error');
            }
            close();
            toast('Changes saved.');
            reload();
          });
          $('#reset', sh).addEventListener('click', () => { close(); openResetPasswordSheet(p); });
          $('#remove', sh).addEventListener('click', async () => {
            close();
            if (!(await confirmDialog({ title: `Remove ${p.full_name}?`, message: 'They will lose access to the staff tools.', confirmLabel: 'Remove' }))) return;
            const { error } = await removeStaff(p.id);
            if (error) return toast(error.message, 'error');
            toast('Staff removed.', 'info');
            reload();
          });
        },
      });
    });
    draw();
  });
  return el;
}
