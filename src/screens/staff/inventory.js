import { listItems, adjustStock, markDamaged } from '../../services/items.service.js';
import { screenEl, esc, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { icon } from '../../components/icons.js';
import { itemBubble } from '../../components/card.js';
import { stockBadge } from '../../components/chip.js';
import { confirmDialog } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { loadInto } from '../../components/load.js';
import { emptyState } from '../../components/empty-state.js';

function row(i) {
  return `<article class="card inv" data-id="${i.id}" aria-label="${esc(i.name)}">
    <div class="row">${itemBubble(i)}
      <div class="grow"><div class="title">${esc(i.name)}</div>
      <div class="sub" data-stock>${i.available_stock} on shelf of ${i.total_stock}${i.damaged_stock ? `, ${i.damaged_stock} damaged` : ''}</div></div>
      <span data-badge>${stockBadge(i)}</span></div>
    <div class="meter inv-meter" aria-hidden="true"><span data-bar style="width:${i.total_stock ? Math.round((i.available_stock / i.total_stock) * 100) : 0}%"></span></div>
    <div class="inv-actions">
      <div class="stepper" role="group" aria-label="Fix stock for ${esc(i.name)}">
        <button type="button" class="icon-btn" data-d="-1" aria-label="Remove one ${esc(i.name)}">${icon('minus', 20)}</button>
        <span class="num" data-num>${i.available_stock}</span>
        <button type="button" class="icon-btn" data-d="1" aria-label="Add one ${esc(i.name)}">${icon('plus', 20)}</button>
      </div>
      <button type="button" class="btn btn-outline btn-sm" data-damage>${icon('wrench', 18)}<span>Mark damaged</span></button>
    </div>
  </article>`;
}

// Staff can fix stock and flag damage. Prices and deleting items are admin only.
export default function inventory() {
  const el = screenEl(`${topbar({ title: 'Inventory', back: false })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), () => listItems(), (items, b) => {
    const low = items.filter((i) => i.available_stock <= 2).length;
    const damaged = items.filter((i) => i.damaged_stock > 0).length;
    b.innerHTML = `
      <div class="search" role="search">${icon('search', 20)}<label class="sr-only" for="q">Search inventory</label>
      <input id="q" class="input" type="search" placeholder="Search inventory" autocomplete="off" /></div>
      <div class="hscroll filter-row" role="group" aria-label="Filter inventory">
        <button type="button" class="filter-chip" data-mode="all" aria-pressed="true">All items</button>
        <button type="button" class="filter-chip" data-mode="low" aria-pressed="false">Low stock (${low})</button>
        <button type="button" class="filter-chip" data-mode="damaged" aria-pressed="false">Damaged (${damaged})</button>
      </div>
      <div class="list" id="list">${items.map(row).join('')}</div>`;
    const list = $('#list', b);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    let mode = 'all';

    // update one card after a change, without redrawing the whole list
    function refresh(card, item) {
      byId[item.id] = item;
      $('[data-stock]', card).textContent = `${item.available_stock} on shelf of ${item.total_stock}${item.damaged_stock ? `, ${item.damaged_stock} damaged` : ''}`;
      $('[data-num]', card).textContent = item.available_stock;
      $('[data-bar]', card).style.width = `${item.total_stock ? Math.round((item.available_stock / item.total_stock) * 100) : 0}%`;
      $('[data-badge]', card).innerHTML = stockBadge(item);
    }

    const matches = (i) => mode === 'all'
      || (mode === 'low' && i.available_stock <= 2)
      || (mode === 'damaged' && i.damaged_stock > 0);

    function apply() {
      const term = $('#q', b).value.trim().toLowerCase();
      let shown = 0;
      $$('.inv', list).forEach((c) => {
        const it = byId[c.dataset.id];
        const ok = matches(it) && (!term || it.name.toLowerCase().includes(term));
        c.hidden = !ok;
        if (ok) shown += 1;
      });
      const empty = $('.empty', list);
      if (empty) empty.remove();
      if (shown) return;
      list.insertAdjacentHTML('beforeend', emptyState(
        mode === 'low' ? { title: 'Nothing is low', text: 'Every item has stock on the shelf.' }
          : mode === 'damaged' ? { title: 'No damaged items', text: 'Nothing is flagged right now.' }
            : { title: 'No items found', text: 'Try another word.' },
      ));
    }

    list.addEventListener('click', async (e) => {
      const card = e.target.closest('.inv');
      if (!card) return;
      const id = card.dataset.id;
      const step = e.target.closest('[data-d]');
      if (step) {
        const { data, error } = await adjustStock(id, Number(step.dataset.d));
        return error ? toast(error.message, 'error') : refresh(card, data);
      }
      if (e.target.closest('[data-damage]')) {
        if (!(await confirmDialog({ title: `Mark one ${byId[id].name} as damaged?`, message: 'It leaves the shelf and the admin is asked to check it.', confirmLabel: 'Mark damaged' }))) return;
        const { data, error } = await markDamaged(id, 1);
        if (error) return toast(error.message, 'error');
        refresh(card, data);
        toast('Flagged for the admin.', 'info');
      }
    });

    $('#q', b).addEventListener('input', apply);
    $$('[data-mode]', b).forEach((m) => m.addEventListener('click', () => {
      mode = m.dataset.mode;
      $$('[data-mode]', b).forEach((x) => x.setAttribute('aria-pressed', String(x === m)));
      apply();
    }));
    staggerIn(list);
  });
  return el;
}
