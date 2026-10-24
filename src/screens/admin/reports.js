import gsap from 'gsap';
import { summary, topItems, exportCsv } from '../../services/reports.service.js';
import { onLeave } from '../../router.js';
import { screenEl, esc, peso, fmtDay, reduceMotion, $, $$ } from '../../components/ui.js';
import { topbar } from '../../components/topbar.js';
import { btn } from '../../components/button.js';
import { icon } from '../../components/icons.js';
import { loadInto, loadAll } from '../../components/load.js';
import { toast } from '../../components/toast.js';

const DAY = 24 * 60 * 60 * 1000;
const startOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const inputDate = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const PRESETS = [['Today', 0], ['Last 7 days', 6], ['Last 30 days', 29]];
const rangeLabel = (a, b) => {
  const fa = fmtDay(new Date(a).toISOString()), fb = fmtDay(new Date(b).toISOString());
  return fa === fb ? fa : `${fa} – ${fb}`;
};

export default function reports() {
  const el = screenEl(`${topbar({ title: 'Reports', back: false })}<div class="content" id="body"></div>`);
  const body = $('#body', el);
  let from = startOf(Date.now() - 6 * DAY);
  let to = startOf(Date.now()) + DAY - 1;

  body.innerHTML = `
    <div class="card form range-card">
      <div class="range-presets" role="group" aria-label="Quick ranges">${PRESETS.map(([l, d], i) => `<button type="button" class="filter-chip" data-preset="${d}" aria-pressed="${i === 1}">${l}</button>`).join('')}</div>
      <div class="two range-dates">
        <div class="field"><label for="from">From</label><input class="input" type="date" id="from" value="${inputDate(from)}" /></div>
        <div class="field"><label for="to">To</label><input class="input" type="date" id="to" value="${inputDate(to)}" /></div>
      </div>
      <p class="form-error" id="range-err" role="alert" hidden>The start date must come before the end date.</p>
    </div>
    <div id="out" aria-live="polite"></div>`;
  const out = $('#out', body);

  function show() {
    loadInto(out, () => loadAll(summary({ from, to }), topItems({ from, to })), ([s, top], o) => {
      const max = Math.max(1, ...top.map((t) => t.count));
      o.innerHTML = `
        <div class="report-tiles">
          <div class="rtile tint-sky"><span class="rtile-ic">${icon('rentals', 20)}</span><span class="rs-num" data-count="${s.rentals}">${s.rentals}</span><span class="rs-label">Rentals</span></div>
          <div class="rtile tint-mint"><span class="rtile-ic">${icon('wallet', 20)}</span><span class="rs-num" data-count="${s.income}" data-money="true">${peso(s.income)}</span><span class="rs-label">Income</span></div>
          <div class="rtile tint-pink"><span class="rtile-ic">${icon('clock', 20)}</span><span class="rs-num" data-count="${s.late_returns}">${s.late_returns}</span><span class="rs-label">Late returns</span></div>
        </div>
        <section class="card" aria-labelledby="t-h">
          <div class="sec-head"><h2 id="t-h" class="sec">Most borrowed</h2><span class="chip chip-muted">${esc(rangeLabel(from, to))}</span></div>
          ${top.length ? `<ol class="top ranked" role="list">${top.map((t, i) => `<li><div class="rank-row"><span class="rank rank-${i + 1}">${i + 1}</span><span class="grow rank-name">${esc(t.name)}</span><strong class="rank-count">${t.count}<small>×</small></strong></div>
            <div class="meter" aria-hidden="true"><span style="width:${Math.round((t.count / max) * 100)}%"></span></div></li>`).join('')}</ol>`
          : `<div class="empty compact"><span class="bubble tint-purple">${icon('chart', 22)}</span><p>No rentals in this range.</p></div>`}
        </section>
        ${btn({ label: 'Export CSV', ic: 'download', block: true, variant: 'secondary', id: 'export' })}`;
      if (!reduceMotion()) {
        $$('[data-count]', o).forEach((n) => {
          const target = Number(n.dataset.count);
          const v = { x: 0 };
          const tw = gsap.to(v, { x: target, duration: 0.6, ease: 'power2.out', onUpdate: () => {
            n.textContent = n.dataset.money === 'true' ? peso(Math.round(v.x)) : Math.round(v.x);
          } });
          onLeave(() => tw.kill());
        });
      }
      $('#export', o).addEventListener('click', async (e) => {
        const btnEl = e.currentTarget;
        btnEl.disabled = true;
        const { data, error } = await exportCsv({ from, to });
        btnEl.disabled = false;
        if (error) return toast(error.message, 'error');
        // On the web this downloads a file. In the Capacitor app it needs the Filesystem and Share plugins (see CAPACITOR.md).
        const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `borrow-a-supply-${inputDate(from)}-to-${inputDate(to)}.csv` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('CSV exported.');
      });
    });
  }

  function readDates() {
    const f = $('#from', body).value, t = $('#to', body).value;
    if (!f || !t) return false;
    const nf = new Date(f + 'T00:00:00').getTime();
    const nt = new Date(t + 'T23:59:59').getTime();
    $('#range-err', body).hidden = nf <= nt;
    if (nf > nt) return false;
    from = nf; to = nt;
    return true;
  }
  $$('[data-preset]', body).forEach((p) => p.addEventListener('click', () => {
    from = startOf(Date.now() - Number(p.dataset.preset) * DAY);
    to = startOf(Date.now()) + DAY - 1;
    $('#from', body).value = inputDate(from);
    $('#to', body).value = inputDate(to);
    $('#range-err', body).hidden = true;
    $$('[data-preset]', body).forEach((x) => x.setAttribute('aria-pressed', String(x === p)));
    show();
  }));
  ['from', 'to'].forEach((id) => $('#' + id, body).addEventListener('change', () => {
    $$('[data-preset]', body).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    if (readDates()) show();
  }));
  show();
  return el;
}
