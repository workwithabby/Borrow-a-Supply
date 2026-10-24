import { getRental } from '../../services/rentals.service.js';
import { screenEl, esc, peso, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { kv, caseStars } from '../../components/card.js';
import { loadInto } from '../../components/load.js';

// Shows the outcome of a pickup or return: mint for success, soft pink for a problem.
export default function result({ params, query }) {
  const el = screenEl(`${topbar({ title: 'Result' })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), () => getRental(params.id), (r, b) => {
    const isReturn = query.type === 'return';
    const problem = !!query.error;
    const flagged = isReturn && !problem && r.condition && r.condition !== 'good';

    let title, text, tint;
    if (problem) { title = 'This did not go through'; text = query.error; tint = 'soft'; }
    else if (flagged) { title = 'Return recorded'; text = 'The item was flagged for the admin and will not go back on the shelf yet.'; tint = 'warn'; }
    else if (isReturn) { title = 'Return confirmed'; text = 'The item is back on the shelf.'; tint = 'success'; }
    else { title = 'Pickup confirmed'; text = 'The item is now out with the student.'; tint = 'success'; }

    b.innerHTML = `
      <div class="card ${tint} center">
        ${problem ? '' : caseStars()}
        <span class="bubble lg" style="background:var(--white)">${icon(problem || flagged ? 'warning' : 'check', 48)}</span>
        <h2>${title}</h2>
        <p>${esc(text)}</p>
      </div>
      <div class="card">
        ${kv('Student', esc(r.user.full_name))}
        ${kv('Item', `${esc(r.item.name)}${r.qty > 1 ? ` x${r.qty}` : ''}`)}
        ${kv('Code', esc(r.code))}
        ${isReturn && !problem && r.late_fee ? kv('Late fee to collect', peso(r.late_fee)) : ''}
      </div>
      <div class="form">
        ${btn({ label: 'Scan next', nav: '/staff/scan', block: true })}
        ${btn({ label: 'Back to Queue', nav: '/staff/queue', variant: 'outline', block: true })}
      </div>`;
  });
  return el;
}
