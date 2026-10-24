import { listMyRentals } from '../../services/rentals.service.js';
import { listItems, listCategories } from '../../services/items.service.js';
import { getSettings } from '../../services/settings.service.js';
import { staffOnDuty } from '../../services/people.service.js';
import { unreadCount } from '../../services/notifications.service.js';
import { onLeave } from '../../router.js';
import { state, firstName } from '../../state.js';
import { screenEl, esc, peso, fmtTime, clock, tick, staggerIn, $ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { iconBtn, linkBtn } from '../../components/button.js';
import { icon, tintFor } from '../../components/icons.js';
import { bubble, itemBubble, itemCover, caseStars } from '../../components/card.js';
import { loadInto, loadAll } from '../../components/load.js';

function activeCard(r) {
  if (!r) {
    return `<section class="card hero blank" aria-labelledby="hero-h">
      ${caseStars()}
      <span class="hero-eyebrow">Borrow Room</span>
      <h2 id="hero-h" class="hero-title">Borrow what you need,<br>return it when you are done.</h2>
      <p class="hero-sub">Calculators, lab coats, drafting tools and more. Reserve in seconds.</p>
      <button type="button" class="btn btn-primary" data-nav="/borrower/browse">Browse items${icon('arrow', 18)}</button>
    </section>`;
  }
  const late = r.status === 'overdue';
  return `<button type="button" class="card tap hero ${late ? 'late' : ''}" data-nav="/borrower/rental/${r.id}">
    ${late ? '' : caseStars()}
    <span class="hero-top"><span class="hero-eyebrow">${late ? 'Overdue rental' : 'Your active rental'}</span>
      <span class="hero-go">${icon('next', 18)}</span></span>
    <span class="hero-item">${itemBubble({ ...r.item, category: null })}
      <span class="grow"><span class="hero-name">${esc(r.item.name)}</span><span class="hero-due">Due ${fmtTime(r.due_at)}</span></span></span>
    <span class="hero-timer"><span class="hero-timer-label">${late ? 'Overdue by' : 'Time left'}</span>
      <span class="countdown" data-due="${r.due_at}" aria-live="off"></span></span>
  </button>`;
}

export default function home() {
  const el = screenEl(`
    ${topbar({
      title: 'Home', back: false,
      actions: iconBtn({ ic: 'bell', label: 'Notifications', nav: '/notifications', id: 'bell' }),
    })}
    <div class="content" id="body"></div>`);
  const body = $('#body', el);

  loadInto(body,
    () => loadAll(listMyRentals(), listItems(), listCategories(), getSettings(), staffOnDuty(), unreadCount()),
    ([rentals, items, cats, settings, onDuty, unread], b) => {
      if (unread > 0) {
        $('#bell', el).insertAdjacentHTML('beforeend', '<span class="dot" aria-hidden="true"></span>');
        $('#bell', el).setAttribute('aria-label', `Notifications, ${unread} new`);
      }
      const active = rentals.find((r) => r.status === 'active' || r.status === 'overdue');
      const reserved = rentals.find((r) => r.status === 'reserved');
      const avail = items.filter((i) => i.available_stock > 0).slice(0, 8);
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      const today = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      b.innerHTML = `
        <div class="home-head">
          <div><p class="sub">${esc(today)}</p><p class="home-hi">${greet}, <strong>${esc(firstName(state.user))}</strong></p></div>
        </div>
        ${activeCard(active)}
        ${reserved ? `<button type="button" class="card tap warn" data-nav="/borrower/rental/${reserved.id}">
          <div class="row">${icon('clock', 22)}<div class="grow"><strong>${esc(reserved.item.name)} is held for you</strong>
          <div class="sub">Pick up in <span data-hold="${reserved.hold_until}"></span></div></div>${icon('next', 20)}</div></button>` : ''}
        <section aria-labelledby="cat-h">
          <h2 id="cat-h" class="sec">Categories</h2>
          <div class="hscroll cat-row">
            ${cats.map((c) => `<button type="button" class="cat-tile" data-nav="/borrower/browse?cat=${c.id}">
              <span class="cat-art tint-${tintFor(c.id)}">${icon(c.icon, 26)}</span>
              <span class="cat-name">${esc(c.name)}</span></button>`).join('')}
          </div>
        </section>
        <section aria-labelledby="av-h">
          <div class="sec-head"><h2 id="av-h" class="sec">Available now</h2>${linkBtn('See all', '/borrower/browse')}</div>
          ${avail.length ? `<div class="hscroll shelf">
            ${avail.map((i) => {
              const low = i.available_stock <= 2;
              const stock = `<span class="chip ${low ? 'chip-reserved' : 'chip-muted'}" aria-hidden="true">${low ? `Only ${i.available_stock} left` : `${i.available_stock} in stock`}</span>`;
              return `<button type="button" class="card tap mini" data-nav="/borrower/item/${i.id}" aria-label="${esc(i.name)}, ${peso(i.fee)} per session, ${i.available_stock} in stock">
                ${itemCover(i, 42, stock)}
                <span class="mini-body">
                  <span class="mini-title">${esc(i.name)}</span>
                  <span class="mini-price">${peso(i.fee)}<span> / session</span></span>
                </span></button>`;
            }).join('')}
          </div>`
          : `<div class="card"><div class="row">${bubble('package', 'yellow')}<div class="grow"><div class="title">Shelf is empty</div><div class="sub">Everything is borrowed right now. Check back soon.</div></div></div></div>`}
        </section>
        <section class="card room-card" aria-labelledby="room-h">
          <div class="sec-head"><h2 id="room-h" class="sec">Borrow Room</h2><span class="chip ${onDuty ? 'chip-returned' : 'chip-muted'}">${onDuty ? `${onDuty} on duty` : 'Closed'}</span></div>
          <div class="room-line"><span class="bubble sm tint-sky">${icon('clock', 18)}</span><span>${esc(settings.room_hours)}</span></div>
          <div class="room-line"><span class="bubble sm tint-pink">${icon('pin', 18)}</span><span>${esc(settings.room_location)}</span></div>
        </section>`;

      // live countdowns
      const stops = [];
      b.querySelectorAll('[data-due]').forEach((n) => {
        const label = n.closest('.hero-timer')?.querySelector('.hero-timer-label');
        stops.push(tick(n, () => {
          const ms = new Date(n.dataset.due) - Date.now();
          if (label) label.textContent = ms > 0 ? 'Time left' : 'Overdue by';
          n.textContent = clock(Math.abs(ms));
        }));
      });
      b.querySelectorAll('[data-hold]').forEach((n) => stops.push(tick(n, () => {
        n.textContent = clock(new Date(n.dataset.hold) - Date.now());
      })));
      onLeave(() => stops.forEach((s) => s()));
      staggerIn(b);
    });
  return el;
}
