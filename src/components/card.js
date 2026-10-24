import { icon, itemIconName, tintFor, starShape } from './icons.js';
import { esc, peso, fmtWhen } from './ui.js';
import { stockBadge, statusChip } from './chip.js';

export const card = (inner, cls = '') => `<div class="card ${cls}">${inner}</div>`;

// Twinkling brand stars for display-case panels (welcome, splash, heroes).
export const caseStars = () => `<div class="case-stars" aria-hidden="true">${starShape(14, 'st1')}${starShape(10, 'st2')}${starShape(18, 'st3')}${starShape(8, 'st4')}</div>`;

// Icon on a soft colored circle. A real photo can replace it later.
export function bubble(iconName, tint = 'pink', size = '') {
  return `<span class="bubble ${size} tint-${tint}">${icon(iconName, size === 'lg' ? 44 : size === 'sm' ? 18 : 24)}</span>`;
}

export function itemBubble(item, size = '') {
  if (item.image) return `<span class="bubble photo ${size}"><img src="${esc(item.image)}" alt="" loading="lazy" /></span>`;
  return bubble(itemIconName(item), tintFor(item.category_id), size);
}

// Full-bleed tinted art block for shelf cards. `extra` goes inside (e.g. a stock chip).
export function itemCover(item, size = 42, extra = '') {
  if (item.image) return `<span class="mini-cover has-photo"><img src="${esc(item.image)}" alt="" loading="lazy" />${extra}</span>`;
  return `<span class="mini-cover tint-${tintFor(item.category_id)}">${icon(itemIconName(item), size)}${extra}</span>`;
}

export function itemCard(item) {
  return `
  <button type="button" class="card tap item-card" data-nav="/borrower/item/${item.id}" aria-label="${esc(item.name)}, ${peso(item.fee)} per session, ${item.available_stock} in stock">
    <div class="row">
      ${itemBubble(item)}
      <div class="grow">
        <div class="title">${esc(item.name)}</div>
        <div class="sub">${peso(item.fee)} per session</div>
      </div>
      ${stockBadge(item)}${icon('next', 18, 'row-chev')}
    </div>
  </button>`;
}

export function rentalRow(r, href) {
  const base = r.status === 'reserved' ? r.reserved_at : r.picked_up_at || r.reserved_at;
  return `
  <button type="button" class="card tap rental-row" data-nav="${href}">
    <div class="row">
      ${bubble(r.item ? itemIconName({ name: r.item.name, category: { icon: 'package' } }) : 'package', tintFor(r.item?.category_id))}
      <div class="grow">
        <div class="title">${esc(r.item?.name)}${r.qty > 1 ? ` x${r.qty}` : ''}</div>
        <div class="sub">${fmtWhen(base)}</div>
      </div>
      ${statusChip(r.status, r.late)}
    </div>
  </button>`;
}

// A plain label and value line used on details screens.
export function kv(label, value) {
  return `<div class="row kv"><span class="sub grow">${esc(label)}</span><strong>${value}</strong></div>`;
}
