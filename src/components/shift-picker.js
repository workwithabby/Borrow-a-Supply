import { icon } from './icons.js';
import { $, $$ } from './ui.js';

// Shift picker: tap the days, then pick the hours with the clock. The result is saved as plain text,
// for example "Mon to Fri, 8:00 AM to 12:00 PM", so the rest of the app can show it as is.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRESETS = [
  { label: 'Morning', from: '08:00', to: '12:00' },
  { label: 'Afternoon', from: '12:00', to: '17:00' },
  { label: 'Whole day', from: '08:00', to: '17:00' },
];
const DEFAULT = { days: [0, 1, 2, 3, 4], from: '08:00', to: '12:00' };

const to12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const to24 = (h, m, ap) => `${String((Number(h) % 12) + (ap === 'PM' ? 12 : 0)).padStart(2, '0')}:${m}`;

function daysText(days) {
  const d = [...days].sort((a, b) => a - b);
  if (!d.length) return '';
  const consecutive = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  if (d.length >= 3 && consecutive) return `${DAYS[d[0]]} to ${DAYS[d[d.length - 1]]}`;
  if (d.length === 2) return `${DAYS[d[0]]} and ${DAYS[d[1]]}`;
  return d.map((x) => DAYS[x]).join(', ');
}

// Reads text like "Tue and Thu, 8:00 AM to 5:00 PM" back into days and times. Falls back to the defaults.
export function parseShift(text = '') {
  const out = { ...DEFAULT, days: [...DEFAULT.days] };
  const t = text.match(/(\d{1,2}):(\d{2}) (AM|PM) to (\d{1,2}):(\d{2}) (AM|PM)/);
  if (t) { out.from = to24(t[1], t[2], t[3]); out.to = to24(t[4], t[5], t[6]); }
  const range = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun) to (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/);
  if (range) {
    const a = DAYS.indexOf(range[1]), b = DAYS.indexOf(range[2]);
    out.days = Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
  } else {
    const dayPart = text.split(/,\s*\d/)[0];
    const found = DAYS.map((d, i) => (new RegExp(`\\b${d}\\b`).test(dayPart) ? i : -1)).filter((i) => i >= 0);
    if (found.length) out.days = found;
  }
  return out;
}

export function shiftPicker(value = '') {
  const v = parseShift(value);
  return `
  <div class="field shift-field" data-field="shift">
    <span class="field-label" id="shift-l">Shift</span>
    <input type="hidden" name="shift" id="shift-val" value="" />
    <div class="shift-card">
      <div class="shift-block">
        <span class="shift-cap">${icon('calendar', 16)} Days</span>
        <div class="shift-days" role="group" aria-labelledby="shift-l">
          ${DAYS.map((d, i) => `<button type="button" class="day-chip" data-day="${i}" aria-pressed="${v.days.includes(i)}">${d}</button>`).join('')}
        </div>
      </div>
      <div class="shift-block">
        <span class="shift-cap">${icon('clock', 16)} Hours</span>
        <div class="shift-presets">
          ${PRESETS.map((p) => `<button type="button" class="filter-chip" data-preset="${p.from}|${p.to}" aria-pressed="false">${p.label}</button>`).join('')}
        </div>
        <div class="two shift-times">
          <div class="field"><label for="shift-from">From</label><input class="input" type="time" id="shift-from" value="${v.from}" /></div>
          <div class="field"><label for="shift-to">To</label><input class="input" type="time" id="shift-to" value="${v.to}" /></div>
        </div>
      </div>
      <p class="shift-sum" id="shift-sum" aria-live="polite"></p>
    </div>
    <p class="field-error" id="e-shift" hidden></p>
  </div>`;
}

// Wires the picker up. Returns { value(), valid() }.
export function bindShiftPicker(root) {
  const hidden = $('#shift-val', root);
  const err = $('#e-shift', root);
  const from = $('#shift-from', root), to = $('#shift-to', root);
  const picked = () => $$('[data-day]', root).filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => Number(b.dataset.day));
  const check = () => {
    if (!picked().length) return 'Pick at least one day.';
    if (!from.value || !to.value) return 'Choose the start and end time.';
    if (to.value <= from.value) return 'The end time must be after the start time.';
    return '';
  };
  const sync = () => {
    const bad = check();
    const text = bad ? '' : `${daysText(picked())}, ${to12(from.value)} to ${to12(to.value)}`;
    hidden.value = text;
    $('#shift-sum', root).textContent = bad ? '' : text;
    $$('[data-preset]', root).forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.preset === `${from.value}|${to.value}`)));
    err.hidden = true;
  };
  $$('[data-day]', root).forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    sync();
  }));
  $$('[data-preset]', root).forEach((p) => p.addEventListener('click', () => {
    [from.value, to.value] = p.dataset.preset.split('|');
    sync();
  }));
  from.addEventListener('change', sync);
  to.addEventListener('change', sync);
  sync();
  return {
    value: () => hidden.value,
    valid() {
      const bad = check();
      err.textContent = bad;
      err.hidden = !bad;
      return !bad;
    },
  };
}
