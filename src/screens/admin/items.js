import { listItems, archiveItem, markFixed } from '../../services/items.service.js';
import { screenEl, esc, peso, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { icon } from '../../components/icons.js';
import { itemBubble } from '../../components/card.js';
import { emptyState } from '../../components/empty-state.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto } from '../../components/load.js';

function row(i) {
  const archived = i.status === 'archived';
  const badge = archived ? '<span class="chip chip-muted">Archived</span>'
    : i.available_stock <= 0 ? '<span class="chip chip-muted">Out of stock</span>'
      : i.available_stock <= 2 ? '<span class="chip chip-reserved">Few left</span>' : '';
  const pct = i.total_stock ? Math.max(0, Math.min(100, Math.round((i.available_stock / i.total_stock) * 100))) : 0;
  const level = archived || i.available_stock <= 0 ? 'out' : i.available_stock <= 2 ? 'low' : 'ok';
  return `<article class="card item-card${archived ? ' is-archived' : ''}" aria-label="${esc(i.name)}">
    <div class="row">${itemBubble(i)}
      <div class="grow"><div class="title">${esc(i.name)}</div>
      <div class="sub">${peso(i.fee)} per session${i.damaged_stock ? ` &middot; ${i.damaged_stock} damaged` : ''}</div></div>
      ${badge}</div>
    <div class="stock">
      <div class="stock-line"><span><strong>${i.available_stock}</strong> of ${i.total_stock} on shelf</span><span class="stock-pct">${pct}%</span></div>
      <div class="meter stock-${level}" aria-hidden="true"><span style="width:${pct}%"></span></div>
    </div>
    <div class="inv-actions item-actions">
      <button type="button" class="btn btn-outline btn-sm" data-nav="/admin/item/${i.id}/edit">${icon('edit', 18)}<span>Edit</span></button>
      <button type="button" class="btn btn-ghost btn-sm" data-archive="${i.id}" data-to="${archived ? 'restore' : 'archive'}">${icon(archived ? 'undo' : 'archive', 18)}<span>${archived ? 'Restore' : 'Archive'}</span></button>
    </div></article>`;
}

export default function adminItems() {
  const el = screenEl(`${topbar({ title: 'Items', back: false })}<div class="content" id="body"></div>`);
  let showArchived = false;
  let q = '';

  loadInto($('#body', el), () => listItems({ includeArchived: true }), (items, b, reload) => {
    const flagged = items.filter((i) => i.damaged_stock > 0);
    const live = items.filter((i) => i.status === 'active');
    const lowN = live.filter((i) => i.available_stock > 0 && i.available_stock <= 2).length;
    const outN = live.filter((i) => i.available_stock <= 0).length;
    b.innerHTML = `
      <div class="items-summary">
        <div class="isum"><span class="rs-num">${live.length}</span><span class="rs-label">Active items</span></div>
        <div class="isum"><span class="rs-num">${lowN}</span><span class="rs-label">Running low</span></div>
        <div class="isum"><span class="rs-num">${outN}</span><span class="rs-label">Out of stock</span></div>
      </div>
      ${flagged.length ? `<section class="card warn flagged" aria-labelledby="fl-h"><h2 id="fl-h" class="flag-h">${icon('warning', 18)} Flagged as damaged</h2>
        ${flagged.map((i) => `<div class="row flag"><div class="grow"><strong>${esc(i.name)}</strong><div>${i.damaged_stock} damaged</div></div>
        <button type="button" class="btn btn-outline btn-sm" data-fix="${i.id}">${icon('wrench', 18)}<span>Mark fixed</span></button></div>`).join('')}</section>` : ''}
      <div class="search" role="search">${icon('search', 20)}<label class="sr-only" for="q">Search items</label>
        <input id="q" class="input" type="search" placeholder="Search items" autocomplete="off" /></div>
      <div class="items-filter"><span class="sub" id="count"></span><button type="button" class="filter-chip" id="arch" aria-pressed="false">Show archived</button></div>
      <div id="list" class="list"></div>
      <button type="button" class="fab" data-nav="/admin/item/new" aria-label="Add item">${icon('plus', 26)}<span>Add item</span></button>`;
    const list = $('#list', b);
    function draw() {
      const shown = items.filter((i) => (showArchived || i.status === 'active') && (!q || i.name.toLowerCase().includes(q)));
      $('#count', b).textContent = `${shown.length} ${shown.length === 1 ? 'item' : 'items'}`;
      list.innerHTML = shown.length ? shown.map(row).join('')
        : emptyState({ title: 'No items', text: 'Add your first item to the Borrow Room.', action: { label: 'Add item', nav: '/admin/item/new' } });
      staggerIn(list);
    }
    $('#q', b).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
    $('#arch', b).addEventListener('click', (e) => { showArchived = !showArchived; e.currentTarget.setAttribute('aria-pressed', String(showArchived)); draw(); });
    list.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-archive]');
      if (!a) return;
      const archive = a.dataset.to === 'archive';
      if (archive && !(await confirmDialog({ title: 'Archive this item?', message: 'Students will no longer see it. You can restore it later.', confirmLabel: 'Archive' }))) return;
      const { error } = await archiveItem(a.dataset.archive, archive);
      if (error) return toast(error.message, 'error');
      toast(archive ? 'Item archived.' : 'Item restored.', 'info');
      reload();
    });
    $$('[data-fix]', b).forEach((f) => f.addEventListener('click', async () => {
      const { error } = await markFixed(f.dataset.fix, 1);
      if (error) return toast(error.message, 'error');
      toast('Marked as fixed.');
      reload();
    }));
    draw();
  });
  return el;
}
