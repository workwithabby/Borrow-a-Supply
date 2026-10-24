import { getItem } from '../../services/items.service.js';
import { getSettings } from '../../services/settings.service.js';
import { screenEl, esc, peso, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { itemBubble, caseStars } from '../../components/card.js';
import { stockBadge } from '../../components/chip.js';
import { loadInto, loadAll } from '../../components/load.js';
import { openReserveSheet } from './reserve-sheet.js';

export default function itemDetails({ params }) {
  const el = screenEl(`${topbar({ title: 'Item Details' })}<div class="content" id="body"></div>`);

  loadInto($('#body', el), () => loadAll(getItem(params.id), getSettings()), ([item, s], b) => {
    const out = item.available_stock <= 0;
    b.innerHTML = `
      <div class="detail-hero display-case">${caseStars()}${itemBubble(item, 'lg')}</div>
      <div>
        <div class="row"><h2 class="grow">${esc(item.name)}</h2>${stockBadge(item)}</div>
        <p class="sub">${esc(item.category?.name || '')}</p>
      </div>
      <p>${esc(item.description)}</p>
      <div class="card">
        <div class="row kv"><span class="grow sub">Fee</span><strong>${peso(item.fee)} per session</strong></div>
        <div class="row kv"><span class="grow sub">In stock</span><strong>${item.available_stock} of ${item.total_stock}</strong></div>
      </div>
      <section class="card" aria-labelledby="r-h">
        <h3 id="r-h">Rules</h3>
        <ul class="rules">
          <li>${icon('clock', 18)}<span>One session is 2 hours. Return it before time runs out.</span></li>
          <li>${icon('wallet', 18)}<span>Late fee: ${esc(s.late_fee_rule)}.</span></li>
          <li>${icon('qr', 18)}<span>Reservations are held for ${s.hold_minutes} minutes.</span></li>
        </ul>
      </section>
      <div class="sticky-cta">
        ${btn({ label: out ? 'Out of stock' : 'Reserve', block: true, id: 'reserve', disabled: out })}
      </div>`;
    $('#reserve', b).addEventListener('click', () => openReserveSheet(item, s));
  });
  return el;
}
