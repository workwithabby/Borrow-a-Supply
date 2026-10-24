import { listItems, listCategories } from '../../services/items.service.js';
import { screenEl, esc, staggerIn, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { icon } from '../../components/icons.js';
import { itemCard } from '../../components/card.js';
import { emptyState } from '../../components/empty-state.js';
import { loadInto, loadAll } from '../../components/load.js';

export default function browse({ query }) {
  const el = screenEl(`${topbar({ title: 'Browse', back: false })}
    <div class="content" id="body"></div>`);
  const body = $('#body', el);
  let cat = query.cat || '';
  let q = '';

  loadInto(body, () => loadAll(listItems(), listCategories()), ([items, cats], b) => {
    const counts = Object.fromEntries(cats.map((c) => [c.id, items.filter((i) => i.category_id === c.id).length]));
    b.innerHTML = `
      <div class="search" role="search">
        ${icon('search', 20)}
        <label class="sr-only" for="q">Search items</label>
        <input id="q" class="input" type="search" placeholder="Search items" autocomplete="off" />
      </div>
      <div class="hscroll filter-row" role="group" aria-label="Filter by category">
        <button type="button" class="filter-chip" data-cat="" aria-pressed="${!cat}">All<span class="n">${items.length}</span></button>
        ${cats.map((c) => `<button type="button" class="filter-chip" data-cat="${c.id}" aria-pressed="${cat === c.id}">${esc(c.name)}<span class="n">${counts[c.id] || 0}</span></button>`).join('')}
      </div>
      <p class="sub" id="count" role="status"></p>
      <div id="list" class="list"></div>`;

    const list = $('#list', b);
    function draw(animate = true) {
      const term = q.trim().toLowerCase();
      const shown = items.filter((i) => (!cat || i.category_id === cat) && (!term || i.name.toLowerCase().includes(term)));
      $('#count', b).textContent = shown.length === 1 ? '1 item' : `${shown.length} items`;
      list.innerHTML = shown.length
        ? shown.map(itemCard).join('')
        : emptyState({ title: 'No items found', text: 'Try another word or pick a different category.', action: { label: 'Clear filters', id: 'clear' } });
      $('#clear', list)?.addEventListener('click', () => { q = ''; cat = ''; $('#q', b).value = ''; sync(); });
      if (animate) staggerIn(list);
    }
    function sync() {
      $$('[data-cat]', b).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
      draw();
    }
    $('#q', b).addEventListener('input', (e) => { q = e.target.value; draw(false); });
    $$('[data-cat]', b).forEach((c) => c.addEventListener('click', () => { cat = c.dataset.cat; sync(); }));
    draw();
  });
  return el;
}
