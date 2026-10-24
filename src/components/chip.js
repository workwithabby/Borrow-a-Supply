import { esc } from './ui.js';

const LABELS = {
  reserved: 'Reserved', active: 'Active', returned: 'Returned', overdue: 'Overdue', cancelled: 'Cancelled', expired: 'Expired',
};

// Status chips follow APP_FLOW section 8. Text is always shown, never color alone.
export function statusChip(status, late = false) {
  if (status === 'returned' && late) return '<span class="chip chip-overdue">Returned late</span>';
  return `<span class="chip chip-${status}">${LABELS[status] || esc(status)}</span>`;
}

export function stockBadge(item) {
  const n = item.available_stock;
  if (n <= 0) return '<span class="chip chip-muted">Out of stock</span>';
  if (n <= 2) return `<span class="chip chip-reserved">Few left</span>`;
  return '<span class="chip chip-returned">Available</span>';
}

export const chip = (text, cls = '') => `<span class="chip ${cls}">${esc(text)}</span>`;
