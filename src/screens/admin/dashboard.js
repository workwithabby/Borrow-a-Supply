import gsap from 'gsap';
import { summary, last7Days, lowStock, latestActivity } from '../../services/reports.service.js';
import { unreadCount } from '../../services/notifications.service.js';
import { screenEl, esc, peso, timeAgo, fmtDay, reduceMotion, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { iconBtn, linkBtn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { loadInto, loadAll } from '../../components/load.js';
import { emptyState } from '../../components/empty-state.js';
import { onLeave } from '../../router.js';

const STAT_TINT = { 'Rentals today': 'sky', 'Active now': 'mint', Overdue: 'pink', 'Income today': 'yellow' };

// How each rental state reads in the activity feed.
const ACT = {
  reserved: { tint: 'yellow', ic: 'clock', verb: 'reserved' },
  active: { tint: 'sky', ic: 'package', verb: 'picked up' },
  returned: { tint: 'mint', ic: 'check', verb: 'returned' },
  overdue: { tint: 'pink', ic: 'warning', verb: 'is late with' },
  cancelled: { tint: 'purple', ic: 'close', verb: 'cancelled' },
  expired: { tint: 'purple', ic: 'clock', verb: 'let expire' },
};

const DAY = 24 * 60 * 60 * 1000;
const startOf = (iso) => { const d = new Date(iso); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Bars are plain SVG rects. A hidden table gives screen readers the same numbers.
function chart(days) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const W = 320, H = 150, pad = 22, bw = 28, gap = (W - bw * days.length) / (days.length + 1);
  const grid = [0, 0.5, 1].map((f) => { const y = Math.round(H - pad - (H - pad - 18) * f); return `<line x1="8" x2="${W - 8}" y1="${y}" y2="${y}" class="chart-grid${f === 0 ? ' base' : ''}"></line>`; }).join('');
  const bars = days.map((d, i) => {
    const h = Math.round(((H - pad - 18) * d.count) / max);
    const x = Math.round(gap + i * (bw + gap));
    const y = H - pad - h;
    return `<g>
      <rect class="bar" x="${x}" y="${y}" width="${bw}" height="${h}" rx="8" fill="${i === days.length - 1 ? 'var(--pink)' : 'var(--purple)'}" opacity="${i === days.length - 1 ? 1 : 0.85}"></rect>
      <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" class="chart-n">${d.count}</text>
      <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="chart-l">${d.label}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ch-t ch-d" class="chart">
    <title id="ch-t">Rentals in the last 7 days</title>
    <desc id="ch-d">${days.map((d) => `${d.label}: ${d.count}`).join(', ')}</desc>${grid}${bars}</svg>
    <table class="sr-only"><caption>Rentals in the last 7 days</caption><tbody>${days.map((d) => `<tr><th>${d.label}</th><td>${d.count}</td></tr>`).join('')}</tbody></table>`;
}

// Grouped-by-day feed: tinted status bubble, who + what, relative time, tap to open.
function feed(acts) {
  if (!acts.length) {
    return `<div class="card">${emptyState({ title: 'No activity yet', text: 'Pickups and returns will show up here.' })}</div>`;
  }
  const today = startOf(Date.now());
  const groups = [];
  acts.forEach((a) => {
    const key = startOf(a.when);
    if (groups[groups.length - 1]?.key === key) groups[groups.length - 1].items.push(a);
    else groups.push({ key, items: [a] });
  });
  const label = (key, iso) => (key === today ? 'Today' : key === today - DAY ? 'Yesterday' : fmtDay(iso));
  return `<div class="card feed-card">${groups.map((g) => {
    const day = label(g.key, g.items[0].when);
    return `<section>
      <h3 class="feed-day">${esc(day)}</h3>
      <ul class="feed" role="list">${g.items.map((a) => {
        const m = ACT[a.status] || ACT.expired;
        return `<li><button type="button" class="feed-row" data-nav="/admin/rental/${esc(a.id)}">
          <span class="bubble sm tint-${m.tint}">${icon(m.ic, 18)}</span>
          <span class="grow feed-body">
            <span class="feed-line"><span class="feed-name">${esc(a.user)}</span><span class="feed-when">${timeAgo(a.when)}</span></span>
            <span class="feed-do">${m.verb} <b>${esc(a.item)}</b>${a.qty > 1 ? ` <span class="feed-qty">×${a.qty}</span>` : ''}</span>
          </span>
          ${icon('next', 16, 'feed-chev')}
        </button></li>`;
      }).join('')}</ul>
    </section>`;
  }).join('')}</div>`;
}

export default function dashboard() {
  const el = screenEl(`${topbar({
    title: 'Dashboard', back: false,
    actions: iconBtn({ ic: 'bell', label: 'Notifications', nav: '/notifications', id: 'bell' }),
  })}<div class="content" id="body"></div>`);

  loadInto($('#body', el), () => loadAll(summary(), last7Days(), lowStock(), latestActivity(), unreadCount()), ([s, days, low, acts, unread], b) => {
    if (unread > 0) $('#bell', el).insertAdjacentHTML('beforeend', '<span class="dot" aria-hidden="true"></span>');
    const stats = [
      ['Rentals today', s.rentals_today, 'rentals', false], ['Active now', s.active_now, 'clock', false],
      ['Overdue', s.overdue, 'warning', false], ['Income today', s.income_today, 'wallet', true],
    ];
    const weekTotal = days.reduce((n, d) => n + d.count, 0);
    b.innerHTML = `
      <header class="dash-head"><div><p class="dash-eyebrow">Overview</p><p class="dash-date">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>${s.overdue > 0 ? `<span class="chip chip-overdue">${icon('warning', 14)} ${s.overdue} overdue</span>` : `<span class="chip chip-success">${icon('check', 14)} All on time</span>`}</header>
      <div class="stats">${stats.map(([label, n, ic, money]) => `
        <div class="card stat tint-card-${STAT_TINT[label]}"><span class="stat-ic">${icon(ic, 20)}</span>
        <div class="num" data-count="${n}" data-money="${money}">${money ? peso(n) : n}</div><div class="stat-label">${label}</div></div>`).join('')}</div>
      <section class="card" aria-labelledby="c-h">
        <div class="sec-head"><h2 id="c-h" class="sec">Last 7 days</h2><span class="chip chip-muted">${weekTotal} rentals</span></div>
        ${chart(days)}</section>
      <section aria-labelledby="l-h">
        <div class="sec-head"><h2 id="l-h" class="sec">Low stock</h2>${linkBtn('Manage', '/admin/items')}</div>
        ${low.length ? `<div class="list">${low.map((i) => `<button type="button" class="card tap" data-nav="/admin/item/${i.id}/edit">
          <div class="row"><span class="bubble sm ${i.available_stock ? 'tint-yellow' : 'tint-pink'}">${icon('package', 18)}</span><div class="grow"><div class="title">${esc(i.name)}</div><div class="sub">${i.available_stock} left on the shelf</div></div>
          <span class="chip ${i.available_stock ? 'chip-reserved' : 'chip-muted'}">${i.available_stock ? 'Few left' : 'Out of stock'}</span>${icon('next', 18)}</div></button>`).join('')}</div>`
        : `<div class="card"><div class="row"><span class="bubble sm tint-mint">${icon('ok', 18)}</span><div class="grow"><div class="title">All stocked</div><div class="sub">No item is running low right now.</div></div></div></div>`}</section>
      <section aria-labelledby="a-h">
        <div class="sec-head"><h2 id="a-h" class="sec">Latest activity</h2>${linkBtn('View report', '/admin/reports')}</div>
        ${feed(acts)}</section>`;

    if (!reduceMotion()) {
      const tl = gsap.timeline();
      $$('[data-count]', b).forEach((n) => {
        const target = Number(n.dataset.count);
        const o = { v: 0 };
        tl.to(o, { v: target, duration: 0.8, ease: 'power2.out', onUpdate: () => {
          n.textContent = n.dataset.money === 'true' ? peso(Math.round(o.v)) : Math.round(o.v);
        } }, 0);
      });
      tl.from($$('.bar', b), { scaleY: 0, transformOrigin: '50% 100%', transformBox: 'fill-box', duration: 0.55, stagger: 0.06, ease: 'power2.out' }, 0.1);
      onLeave(() => tl.kill());
    }
  });
  return el;
}
