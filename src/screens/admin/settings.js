import { getSettings, updateSettings, postAnnouncement } from '../../services/settings.service.js';
import { listCategories, createCategory, deleteCategory } from '../../services/items.service.js';
import { screenEl, esc, withLoading, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { field, textareaField, showErrors, liveClear, formError, formData } from '../../components/input.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto, loadAll } from '../../components/load.js';

export default function settings() {
  const el = screenEl(`${topbar({ title: 'Room Settings' })}<div class="content" id="body"></div>`);

  loadInto($('#body', el), () => loadAll(getSettings(), listCategories()), ([s, cats], b, reload) => {
    const head = (id, ic, tint, title, text) => `<div class="set-head"><span class="bubble sm tint-${tint}">${icon(ic, 18)}</span><div><h2 id="${id}">${title}</h2><p class="sub">${text}</p></div></div>`;
    b.innerHTML = `
      <form class="form card set-card" id="room" novalidate aria-labelledby="room-h">
        ${head('room-h', 'pin', 'sky', 'Room', 'Where and when students can borrow.')}
        ${field({ name: 'room_hours', label: 'Room hours', value: s.room_hours, hint: 'Example: Mon to Fri, 8:00 AM to 5:00 PM' })}
        ${field({ name: 'room_location', label: 'Location', value: s.room_location, hint: 'Where students pick up and return items.' })}
        <div class="set-divider"><span>Borrowing limits</span></div>
        <div class="two">
          ${field({ name: 'hold_minutes', label: 'Hold time (min)', value: s.hold_minutes, inputmode: 'numeric' })}
          ${field({ name: 'max_active_rentals', label: 'Max open rentals', value: s.max_active_rentals, inputmode: 'numeric' })}
        </div>
        <p class="field-hint set-note">Hold time is how long a reservation waits (5 to 60, default 15).</p>
        ${field({ name: 'late_fee_per_hour', label: 'Late fee per extra hour (PHP)', value: s.late_fee_per_hour, inputmode: 'numeric' })}
        ${btn({ label: 'Save settings', type: 'submit', block: true, id: 'save' })}
      </form>

      <section class="card set-card" aria-labelledby="cat-h">
        ${head('cat-h', 'package', 'yellow', 'Categories', `${cats.length} ${cats.length === 1 ? 'category' : 'categories'} students can browse.`)}
        <ul class="plain cat-list" role="list">${cats.map((c) => `<li class="cat-row"><span class="bubble sm tint-purple">${icon(c.icon, 18)}</span><span class="grow">${esc(c.name)}</span>
          <button type="button" class="icon-btn plain" data-del="${c.id}" aria-label="Delete category ${esc(c.name)}">${icon('trash', 20)}</button></li>`).join('')}</ul>
        <form class="form" id="cat" novalidate>
          ${field({ name: 'cat_name', label: 'New category', placeholder: 'Example: Art supplies' })}
          ${btn({ label: 'Add category', variant: 'outline', ic: 'plus', type: 'submit', block: true, id: 'addcat' })}
        </form>
      </section>

      <form class="form card set-card" id="ann" novalidate aria-labelledby="ann-h">
        ${head('ann-h', 'bell', 'pink', 'Announcement', 'Sends a notification to every active person.')}
        ${field({ name: 'title', label: 'Title', placeholder: 'Room closed on Friday' })}
        ${textareaField({ name: 'body', label: 'Message' })}
        ${btn({ label: 'Send announcement', ic: 'megaphone', type: 'submit', block: true, id: 'send' })}
      </form>`;

    const room = $('#room', b);
    liveClear(room);
    room.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      formError(room, '');
      const v = formData(room);
      const e = {};
      if (!v.room_hours.trim()) e.room_hours = 'Add the room hours.';
      if (!v.room_location.trim()) e.room_location = 'Add the room location.';
      if (!(Number(v.hold_minutes) >= 5 && Number(v.hold_minutes) <= 60)) e.hold_minutes = 'Use a number between 5 and 60.';
      if (!(Number(v.late_fee_per_hour) >= 0) || v.late_fee_per_hour === '') e.late_fee_per_hour = 'Enter 0 or more.';
      if (!(Number(v.max_active_rentals) >= 1)) e.max_active_rentals = 'Allow at least 1.';
      showErrors(room, e);
      if (Object.keys(e).length) return;
      const { error } = await withLoading($('#save', room), () => updateSettings(v));
      error ? formError(room, error.message) : toast('Settings saved.');
    });

    const cat = $('#cat', b);
    liveClear(cat);
    cat.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = $('#f-cat_name', cat).value;
      if (!name.trim()) return showErrors(cat, { cat_name: 'Type a category name.' });
      const { error } = await withLoading($('#addcat', cat), () => createCategory({ name }));
      if (error) return showErrors(cat, { cat_name: error.message });
      toast('Category added.');
      reload();
    });
    $$('[data-del]', b).forEach((d) => d.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Delete this category?', message: 'This only works when no items use it.', confirmLabel: 'Delete' }))) return;
      const { error } = await deleteCategory(d.dataset.del);
      if (error) return toast(error.message, 'error');
      toast('Category deleted.', 'info');
      reload();
    }));

    const ann = $('#ann', b);
    liveClear(ann);
    ann.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = formData(ann);
      const e = {};
      if (!v.title.trim()) e.title = 'Add a title.';
      if (!v.body.trim()) e.body = 'Add a message.';
      showErrors(ann, e);
      if (Object.keys(e).length) return;
      const { error } = await withLoading($('#send', ann), () => postAnnouncement(v));
      if (error) return formError(ann, error.message);
      ann.reset();
      toast('Announcement sent.');
    });
  });
  return el;
}
