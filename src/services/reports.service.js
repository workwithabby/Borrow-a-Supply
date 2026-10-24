// Numbers for the admin Dashboard and Reports. Worked out in the app from the rentals the admin can read.
import { supabase, run, ok } from './supabase.js';
import { lateFeeFor } from './rentals.service.js';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const money = (r) => (r.paid || r.status === 'returned' ? Number(r.fee) + Number(r.late_fee || 0) : 0);
const counts = (r) => !['cancelled', 'expired'].includes(r.status);
const when = (r) => new Date(r.reserved_at).getTime();
const inRange = (r, from, to) => when(r) >= from && when(r) <= to;

async function allRentals() {
  await supabase.rpc('sweep_rentals');
  return ok(await supabase
    .from('rentals')
    .select('*, item:items(name), user:profiles!rentals_user_id_fkey(full_name, student_id)')
    .order('reserved_at', { ascending: false }));
}

export const summary = ({ from = startOfDay(Date.now()), to = Date.now() + DAY } = {}) =>
  run(async () => {
    const all = await allRentals();
    const today = startOfDay(Date.now());
    const inR = all.filter((r) => inRange(r, from, to) && counts(r));
    const todayR = all.filter((r) => inRange(r, today, today + DAY) && counts(r));
    return {
      rentals: inR.length,
      income: inR.reduce((s, r) => s + money(r), 0),
      late_returns: inR.filter((r) => r.status === 'returned' && r.returned_at > r.due_at).length,
      rentals_today: todayR.length,
      income_today: todayR.reduce((s, r) => s + money(r), 0),
      active_now: all.filter((r) => r.status === 'active').length,
      overdue: all.filter((r) => r.status === 'overdue').length,
    };
  });

export const last7Days = () =>
  run(async () => {
    const all = await allRentals();
    const today = startOfDay(Date.now());
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const start = today - i * DAY;
      const count = all.filter((r) => inRange(r, start, start + DAY) && counts(r)).length;
      days.push({ date: new Date(start).toISOString(), label: new Date(start).toLocaleDateString([], { weekday: 'short' }), count });
    }
    return days;
  });

export const topItems = ({ from = 0, to = Date.now() + DAY, limit = 5 } = {}) =>
  run(async () => {
    const tally = {};
    (await allRentals()).filter((r) => inRange(r, from, to) && counts(r)).forEach((r) => {
      const key = r.item_id;
      tally[key] = tally[key] || { item_id: key, name: r.item?.name || 'Item', count: 0 };
      tally[key].count += r.qty;
    });
    return Object.values(tally).sort((a, b) => b.count - a.count).slice(0, limit);
  });

export const lowStock = ({ threshold = 2 } = {}) =>
  run(async () => ok(await supabase.from('items').select('*').eq('status', 'active').lte('available_stock', threshold).order('available_stock')));

export const flaggedItems = () =>
  run(async () => ok(await supabase.from('items').select('*').gt('damaged_stock', 0)));

export const latestActivity = ({ limit = 8 } = {}) =>
  run(async () => (await allRentals())
    .map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      qty: r.qty,
      when: r.returned_at || r.picked_up_at || r.reserved_at,
      user: r.user?.full_name || 'A student',
      item: r.item?.name || 'an item',
    }))
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, limit));

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const exportCsv = ({ from = 0, to = Date.now() + DAY } = {}) =>
  run(async () => {
    const { data: s } = await supabase.from('settings').select('late_fee_per_hour').eq('id', 1).single();
    const head = ['Code', 'Student', 'Student ID', 'Item', 'Qty', 'Status', 'Reserved', 'Returned', 'Fee', 'Late fee', 'Paid', 'Condition'];
    const rows = (await allRentals()).filter((r) => inRange(r, from, to)).map((r) => {
      const late = r.status === 'overdue' ? lateFeeFor(r, s) : r.late_fee || 0;
      return [r.code, r.user?.full_name, r.user?.student_id, r.item?.name, r.qty, r.status, r.reserved_at, r.returned_at || '', r.fee, late, r.paid ? 'yes' : 'no', r.condition || ''];
    });
    return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  });
