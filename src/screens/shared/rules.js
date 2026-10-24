import { getSettings } from '../../services/settings.service.js';
import { screenEl, esc, peso, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { loadInto } from '../../components/load.js';
import { icon } from '../../components/icons.js';

const FAQ = [
  ['How do I borrow something?', 'Find the item in Browse, tap Reserve, then show your QR code to the staff at the Borrow Room. They scan it and hand you the item.'],
  ['What if I am late to pick up?', 'Your reservation is held for a short time. If you do not arrive before the timer ends, it expires and the item goes back on the shelf.'],
  ['How do I pay?', 'Pay in cash at the room, or choose the e-wallet option when you reserve (a demo for now).'],
  ['I broke or lost something. What now?', 'Tell the staff when you return it. They will note the condition and the admin will follow up.'],
];

// Shared by the sign up link and the Profile menu, so it works before login too.
export default function rulesScreen() {
  const el = screenEl(`${topbar({ title: 'Rules and Help' })}<div class="content" id="body"></div>`);
  loadInto($('#body', el), getSettings, (s, b) => {
    const facts = [
      ['sky', 'package', s.max_active_rentals, 'Open rentals at a time'],
      ['yellow', 'clock', `${s.hold_minutes} min`, 'Reservation hold'],
      ['mint', 'calendar', '2 hrs', 'Per session'],
      ['pink', 'wallet', `from ${peso(15)}`, 'Fee per session'],
    ];
    const rules = [
      'Borrow with your own account only.',
      `You can have up to <strong>${s.max_active_rentals}</strong> open rentals at a time.`,
      `Reservations are held for <strong>${s.hold_minutes} minutes</strong>.`,
      'One session is 2 hours. Return the item before the session ends.',
      `Late fee: <strong>${esc(s.late_fee_rule)}</strong>.`,
      'Check the item with the staff when you pick it up and when you return it.',
    ];
    b.innerHTML = `
      <section class="help-hero display-case">
        <p class="hero-eyebrow">Borrow Room</p>
        <h2 class="help-title">Borrow smart, return on time.</h2>
        <p class="help-sub">${icon('pin', 16)}<span>${esc(s.room_location)}</span></p>
        <p class="help-sub">${icon('clock', 16)}<span>${esc(s.room_hours)}</span></p>
      </section>
      <div class="facts">${facts.map(([t, ic, n, l]) => `<div class="fact tint-${t}"><span class="fact-ic">${icon(ic, 18)}</span><strong>${n}</strong><span>${l}</span></div>`).join('')}</div>
      <section class="card" aria-labelledby="r-h">
        <div class="sec-head"><h2 id="r-h" class="sec">Borrowing rules</h2></div>
        <ol class="rule-steps">${rules.map((r, i) => `<li><span class="step-n">${i + 1}</span><span>${r}</span></li>`).join('')}</ol>
      </section>
      <section aria-labelledby="h-h">
        <div class="sec-head"><h2 id="h-h" class="sec">Help</h2></div>
        <div class="list">${FAQ.map(([q, a]) => `<details class="card faq"><summary><span>${esc(q)}</span>${icon('next', 18)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      </section>`;
  });
  return el;
}
