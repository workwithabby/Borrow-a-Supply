import { icon } from './icons.js';
import { fmtWhen } from './ui.js';

// Steps of a rental, built from its timestamps. Used by the borrower and staff detail screens.
export function timeline(r) {
  const steps = [{ label: 'Reserved', at: r.reserved_at, done: true }];
  if (r.status === 'cancelled') steps.push({ label: 'Cancelled', at: null, done: true, bad: true });
  else if (r.status === 'expired') steps.push({ label: 'Expired, not picked up in time', at: r.hold_until, done: true, bad: true });
  else {
    steps.push({ label: 'Picked up', at: r.picked_up_at, done: !!r.picked_up_at });
    if (r.status === 'overdue') steps.push({ label: 'Overdue', at: r.due_at, done: true, bad: true });
    steps.push({ label: r.returned_at && r.late ? 'Returned late' : 'Returned', at: r.returned_at, done: !!r.returned_at });
  }
  return `<ol class="timeline" aria-label="Rental steps">${steps.map((s) => `
    <li class="${s.done ? 'done' : ''} ${s.bad ? 'bad' : ''}">
      <span class="dot">${s.done ? icon(s.bad ? 'close' : 'check', 14) : ''}</span>
      <div><strong>${s.label}</strong>${s.at ? `<div class="sub">${fmtWhen(s.at)}</div>` : ''}</div>
    </li>`).join('')}</ol>`;
}
