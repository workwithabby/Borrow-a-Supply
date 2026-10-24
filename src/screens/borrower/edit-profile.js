import { state, setUser } from '../../state.js';
import { updateProfile } from '../../services/auth.service.js';
import { back } from '../../router.js';
import { screenEl, withLoading, esc, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { avatar } from '../../components/avatar.js';
import { shrinkImage } from '../../components/image.js';
import { field, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { toast } from '../../components/toast.js';

// Shared by every role. Students also edit their student ID; staff and admin edit name and photo.
export default function editProfile() {
  const u = state.user;
  const isStudent = u.role === 'user';
  let photo = u.avatar || null;

  const el = screenEl(`
    ${topbar({ title: 'Edit Profile' })}
    <div class="content">
      <form class="form" id="form" novalidate>
        <div class="avatar-edit">
          <div class="avatar-edit-pic" id="pic">${avatar({ ...u, avatar: photo }, 'xl')}</div>
          <input type="file" id="photo" accept="image/*" class="sr-only" aria-label="Choose profile photo" />
          <div class="avatar-edit-actions">
            <label for="photo" class="btn btn-outline btn-sm">${icon('camera', 18)}<span id="photo-lbl">${photo ? 'Change photo' : 'Add photo'}</span></label>
            <button type="button" class="btn btn-ghost btn-sm" id="rm" ${photo ? '' : 'hidden'}>${icon('trash', 18)}<span>Remove</span></button>
          </div>
          <p class="field-error" id="photo-err" role="alert" hidden></p>
        </div>
        ${field({ name: 'full_name', label: 'Full name', value: u.full_name, autocomplete: 'name' })}
        ${isStudent ? field({ name: 'student_id', label: 'Student ID', value: u.student_id, inputmode: 'numeric' }) : ''}
        <div class="field"><label for="email-ro">${isStudent ? 'School email' : 'Email'}</label>
          <input class="input" id="email-ro" value="${esc(u.email)}" disabled aria-describedby="email-h" />
          <p class="field-hint" id="email-h">Email cannot be changed here.</p></div>
        ${btn({ label: 'Save changes', type: 'submit', block: true, id: 'submit' })}
      </form>
    </div>`);
  liveClear(el);

  const photoErr = $('#photo-err', el);
  const refresh = () => {
    $('#pic', el).innerHTML = avatar({ ...u, full_name: $('#f-full_name', el).value || u.full_name, avatar: photo }, 'xl');
    $('#rm', el).hidden = !photo;
    $('#photo-lbl', el).textContent = photo ? 'Change photo' : 'Add photo';
  };
  $('#f-full_name', el).addEventListener('input', () => { if (!photo) refresh(); });
  $('#photo', el).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    photoErr.hidden = true;
    if (!file) return;
    if (!file.type.startsWith('image/')) { photoErr.textContent = 'Choose an image file.'; photoErr.hidden = false; return; }
    try { photo = await shrinkImage(file, 320, true); refresh(); } catch { photoErr.textContent = 'That image could not be read. Try another.'; photoErr.hidden = false; }
    e.target.value = '';
  });
  $('#rm', el).addEventListener('click', () => { photo = null; refresh(); });

  $('#form', el).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    formError(el, '');
    const v = formData(ev.currentTarget);
    const errors = {};
    if (v.full_name.trim().length < 2) errors.full_name = 'Please enter your full name.';
    if (isStudent && !/^\d{6,10}$/.test((v.student_id || '').trim())) errors.student_id = 'Student ID should be 6 to 10 numbers.';
    showErrors(el, errors);
    if (Object.keys(errors).length) return;
    const { data, error } = await withLoading($('#submit', el), () => updateProfile({ ...v, avatar: photo }));
    if (error) return error.code === 'id_taken' ? showErrors(el, { student_id: error.message }) : formError(el, error.message);
    setUser(data);
    toast('Profile saved.');
    back();
  });
  return el;
}
