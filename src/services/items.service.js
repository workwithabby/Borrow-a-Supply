// Items and categories.
import { supabase, run, ok, fail } from './supabase.js';

const WITH_CAT = '*, category:categories(id, name, icon)';

export const listCategories = () =>
  run(async () => ok(await supabase.from('categories').select('*').order('name')));

export const listItems = ({ includeArchived = false, category_id = null, q = '' } = {}) =>
  run(async () => {
    let query = supabase.from('items').select(WITH_CAT).order('name');
    if (!includeArchived) query = query.eq('status', 'active');
    if (category_id) query = query.eq('category_id', category_id);
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    return ok(await query);
  });

export const getItem = (id) =>
  run(async () => {
    const item = ok(await supabase.from('items').select(WITH_CAT).eq('id', id).maybeSingle());
    if (!item) fail('We could not find that item.', 'not_found');
    return item;
  });

function checkItem(f) {
  if (!f.name || !f.name.trim()) fail('Add an item name.', 'invalid');
  if (!(Number(f.fee) > 0)) fail('Fee must be more than zero.', 'invalid');
  if (!(Number(f.total_stock) >= 0)) fail('Stock cannot be negative.', 'invalid');
}

export const createItem = (f) =>
  run(async () => {
    checkItem(f);
    const total = Math.floor(Number(f.total_stock));
    return ok(await supabase.from('items').insert({
      category_id: f.category_id, name: f.name.trim(), description: (f.description || '').trim(),
      fee: Number(f.fee), total_stock: total, available_stock: total, status: f.status || 'active',
      image: f.image || null,
    }).select(WITH_CAT).single());
  });

export const updateItem = (id, f) =>
  run(async () => {
    checkItem(f);
    const item = ok(await supabase.from('items').select('*').eq('id', id).maybeSingle());
    if (!item) fail('We could not find that item.', 'not_found');
    const out = item.total_stock - item.available_stock - item.damaged_stock;
    const total = Math.floor(Number(f.total_stock));
    if (total < out + item.damaged_stock) fail('Stock cannot be lower than items that are out or damaged.', 'invalid');
    return ok(await supabase.from('items').update({
      category_id: f.category_id, name: f.name.trim(), description: (f.description || '').trim(),
      fee: Number(f.fee), status: f.status || item.status, image: f.image || null,
      total_stock: total, available_stock: item.available_stock + (total - item.total_stock),
    }).eq('id', id).select(WITH_CAT).single());
  });

export const archiveItem = (id, archived = true) =>
  run(async () => ok(await supabase.from('items').update({ status: archived ? 'archived' : 'active' }).eq('id', id).select(WITH_CAT).single()));

async function change(id, fn) {
  const item = ok(await supabase.from('items').select('*').eq('id', id).maybeSingle());
  if (!item) fail('We could not find that item.', 'not_found');
  const patch = fn(item);
  return ok(await supabase.from('items').update(patch).eq('id', id).select(WITH_CAT).single());
}

// Staff fix stock with + and -. Changes the shelf count and the total together.
export const adjustStock = (id, delta) =>
  run(() => change(id, (i) => {
    if (i.available_stock + delta < 0) fail('There are no more on the shelf to remove.', 'invalid');
    return { available_stock: i.available_stock + delta, total_stock: i.total_stock + delta };
  }));

export const markDamaged = (id, qty = 1) =>
  run(() => change(id, (i) => {
    if (i.available_stock < qty) fail('There are none on the shelf to mark.', 'invalid');
    return { available_stock: i.available_stock - qty, damaged_stock: i.damaged_stock + qty };
  }));

export const markFixed = (id, qty = 1) =>
  run(() => change(id, (i) => {
    if (i.damaged_stock < qty) fail('Nothing is flagged for this item.', 'invalid');
    return { damaged_stock: i.damaged_stock - qty, available_stock: i.available_stock + qty };
  }));

export const createCategory = ({ name, icon = 'package' }) =>
  run(async () => {
    if (!name || !name.trim()) fail('Add a category name.', 'invalid');
    const { data, error } = await supabase.from('categories').insert({ name: name.trim(), icon }).select().single();
    if (error) {
      if (error.code === '23505') fail('That category already exists.', 'invalid');
      throw error;
    }
    return data;
  });

export const deleteCategory = (id) =>
  run(async () => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') fail('Move or archive the items in this category first.', 'invalid');
      throw error;
    }
  });
