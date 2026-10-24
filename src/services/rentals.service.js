// Reservations and rentals. Stock changes happen inside Postgres functions (see supabase/schema.sql)
// so they stay correct when many people use the app at once.
import { supabase, run, ok, fail, myId } from './supabase.js';

const MIN = 60 * 1000;
export const SESSION_MINUTES = 120; // one session = 2 hours
export const OPEN_STATUSES = ['reserved', 'active', 'overdue'];

const SELECT = `*,
  item:items(id, name, category_id, fee, image),
  user:profiles!rentals_user_id_fkey(id, full_name, student_id, email),
  handler:profiles!rentals_handled_by_fkey(id, full_name)`;

let holdMinutes = 15;
async function loadHold() {
  const { data } = await supabase.from('settings').select('hold_minutes').eq('id', 1).maybeSingle();
  if (data) holdMinutes = data.hold_minutes;
}

// Adds the hold deadline and a late flag to a rental row.
function shape(r) {
  return {
    ...r,
    hold_until: new Date(new Date(r.reserved_at).getTime() + holdMinutes * MIN).toISOString(),
    late: r.returned_at ? r.returned_at > r.due_at : false,
  };
}

// Expires old holds and flags late rentals before we read.
async function fresh() {
  await supabase.rpc('sweep_rentals');
  await loadHold();
}

export function lateFeeFor(rental, settings) {
  const end = rental.returned_at ? new Date(rental.returned_at) : new Date();
  const late = end.getTime() - new Date(rental.due_at).getTime();
  if (late <= 0) return 0;
  return Math.ceil(late / (60 * MIN)) * settings.late_fee_per_hour * rental.qty;
}

async function fetchOne(id) {
  const r = ok(await supabase.from('rentals').select(SELECT).eq('id', id).maybeSingle());
  if (!r) fail('We could not find that rental.', 'not_found');
  return shape(r);
}

export const reserve = ({ item_id, qty = 1, sessions = 1, pay_method = 'cash' }) =>
  run(async () => {
    const { data, error } = await supabase.rpc('reserve_item', { p_item: item_id, p_qty: qty, p_sessions: sessions, p_pay: pay_method });
    if (error) {
      const code = /open rentals/i.test(error.message) ? 'limit' : /stock/i.test(error.message) ? 'no_stock' : 'error';
      fail(error.message, code);
    }
    await loadHold();
    return fetchOne(data.id);
  });

export const cancel = (id) =>
  run(async () => {
    ok(await supabase.rpc('cancel_reservation', { p_rental: id }));
    return fetchOne(id);
  });

export const getRental = (id) =>
  run(async () => {
    await fresh();
    return fetchOne(id);
  });

// Staff type or scan a code. Accepts "4F7K" or "bas-4f7k".
export const findByCode = (code) =>
  run(async () => {
    let c = (code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (c && !c.startsWith('BAS-')) c = 'BAS-' + c.replace(/^BAS/, '');
    await fresh();
    const r = ok(await supabase.from('rentals').select(SELECT).eq('code', c).maybeSingle());
    if (!r) fail('We could not find that code. Check it and try again.', 'not_found');
    return shape(r);
  });

export const listMyRentals = () =>
  run(async () => {
    const id = await myId();
    await fresh();
    const rows = ok(await supabase.from('rentals').select(SELECT).eq('user_id', id).order('reserved_at', { ascending: false }));
    return rows.map(shape);
  });

export const listAllRentals = ({ status = null, sinceDays = null } = {}) =>
  run(async () => {
    await fresh();
    let q = supabase.from('rentals').select(SELECT).order('reserved_at', { ascending: false });
    if (status) q = Array.isArray(status) ? q.in('status', status) : q.eq('status', status);
    if (sinceDays != null) q = q.gte('reserved_at', new Date(Date.now() - sinceDays * 24 * 60 * MIN).toISOString());
    return ok(await q).map(shape);
  });

export const confirmPickup = (id, { paid = true } = {}) =>
  run(async () => {
    ok(await supabase.rpc('confirm_pickup', { p_rental: id, p_paid: !!paid }));
    await loadHold();
    return fetchOne(id);
  });

export const confirmReturn = (id, { condition = 'good', note = '' } = {}) =>
  run(async () => {
    ok(await supabase.rpc('confirm_return', { p_rental: id, p_condition: condition, p_note: note }));
    await loadHold();
    return fetchOne(id);
  });
