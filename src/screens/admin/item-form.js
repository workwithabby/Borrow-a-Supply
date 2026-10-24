import { getItem, listCategories, createItem, updateItem } from '../../services/items.service.js';
import { back } from '../../router.js';
import { screenEl, withLoading, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { field, selectField, textareaField, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { toast } from '../../components/toast.js';
import { loadInto, loadAll } from '../../components/load.js';
import { icon } from '../../components/icons.js';
import { shrinkImage as shrink } from '../../components/image.js';

const photoField = (src) => `<div class="field photo-field">
  <span class="field-label" id="photo-l">Photo <span class="sub">(optional)</span></span>
  <input type="hidden" name="image" id="image" />
  <input type="file" id="photo" accept="image/*" class="sr-only" aria-labelledby="photo-l" />
  <div class="photo-drop">
    <img id="preview" alt="Item photo preview" ${src ? `src="${src}"` : 'hidden'} />
    <label for="photo" class="photo-cta" id="cta" ${src ? 'hidden' : ''}>${icon('camera', 28)}<strong>Upload a photo</strong><span class="sub">JPG or PNG, shown to students</span></label>
    <div class="photo-actions" id="pact" ${src ? '' : 'hidden'}>
      <label for="photo" class="btn btn-outline btn-sm">${icon('camera', 18)}<span>Change</span></label>
      <button type="button" class="btn btn-ghost btn-sm" id="rm">${icon('close', 18)}<span>Remove</span></button>
    </div>
  </div>
  <p class="field-error" id="photo-err" role="alert" hidden></p>
</div>`;

// Add or edit an item. Same form, so the edit page cannot drift from the add page.
export default function itemForm({ params }) {
  const editing = !!params.id;
  const el = screenEl(`${topbar({ title: editing ? 'Edit Item' : 'Add Item' })}<div class="content" id="body"></div>`);

  const fetcher = () => loadAll(listCategories(), editing ? getItem(params.id) : Promise.resolve({ data: null, error: null }));
  loadInto($('#body', el), fetcher, ([cats, item], b) => {
    const v = item || { name: '', category_id: cats[0]?.id, description: '', fee: '', total_stock: '', status: 'active' };
    b.innerHTML = `<form class="form" id="form" novalidate>
      ${photoField(v.image)}
      ${field({ name: 'name', label: 'Item name', value: v.name })}
      ${selectField({ name: 'category_id', label: 'Category', value: v.category_id, options: cats.map((c) => ({ value: c.id, label: c.name })) })}
      ${textareaField({ name: 'description', label: 'Description', value: v.description })}
      ${field({ name: 'fee', label: 'Fee per session (PHP)', value: v.fee, inputmode: 'numeric' })}
      ${field({ name: 'total_stock', label: 'Total stock', value: v.total_stock, inputmode: 'numeric' })}
      ${selectField({ name: 'status', label: 'Status', value: v.status, options: [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }] })}
      ${btn({ label: editing ? 'Save changes' : 'Add item', type: 'submit', block: true, id: 'submit' })}
    </form>`;
    liveClear(b);
    const image = $('#image', b), preview = $('#preview', b), photoErr = $('#photo-err', b);
    image.value = v.image || '';
    const setPhoto = (data) => {
      image.value = data || '';
      preview.hidden = !data;
      if (data) preview.src = data;
      $('#cta', b).hidden = !!data;
      $('#pact', b).hidden = !data;
    };
    $('#photo', b).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      photoErr.hidden = true;
      if (!file) return;
      if (!file.type.startsWith('image/')) { photoErr.textContent = 'Choose an image file.'; photoErr.hidden = false; return; }
      try { setPhoto(await shrink(file)); } catch { photoErr.textContent = 'That image could not be read. Try another.'; photoErr.hidden = false; }
      e.target.value = '';
    });
    $('#rm', b).addEventListener('click', () => setPhoto(''));
    $('#form', b).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      formError(b, '');
      const f = formData(ev.currentTarget);
      const errors = {};
      if (!f.name.trim()) errors.name = 'Add an item name.';
      if (!(Number(f.fee) > 0)) errors.fee = 'Enter a fee more than zero.';
      if (f.total_stock === '' || !(Number(f.total_stock) >= 0) || !Number.isInteger(Number(f.total_stock))) errors.total_stock = 'Enter a whole number, 0 or more.';
      showErrors(b, errors);
      if (Object.keys(errors).length) return;
      const { error } = await withLoading($('#submit', b), () => (editing ? updateItem(params.id, f) : createItem(f)));
      if (error) return error.code === 'invalid' && /stock/i.test(error.message) ? showErrors(b, { total_stock: error.message }) : formError(b, error.message);
      toast(editing ? 'Item saved.' : 'Item added.');
      back();
    });
  });
  return el;
}
