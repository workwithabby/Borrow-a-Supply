// One shared Supabase client, plus small helpers every service uses.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export function fail(message, code = 'error') {
  const err = new Error(message);
  err.code = code;
  throw err;
}

function friendly(e) {
  const msg = e?.message || '';
  if (/row-level security|permission denied/i.test(msg)) return 'You do not have access to this.';
  if (/failed to fetch|networkerror/i.test(msg)) return 'Cannot reach the server. Check your internet and try again.';
  return msg || 'Something went wrong.';
}

// Runs fn and always resolves to { data, error }, so screens never need try/catch.
export async function run(fn) {
  try {
    const data = await fn();
    return { data: data === undefined ? null : data, error: null };
  } catch (e) {
    return { data: null, error: { message: friendly(e), code: e.code || 'error' } };
  }
}

// Unwraps a Supabase result or throws its error.
export function ok({ data, error }) {
  if (error) {
    const err = new Error(error.message);
    err.code = error.code;
    throw err;
  }
  return data;
}

export async function myId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) fail('Please log in first.', 'auth');
  return id;
}

export async function myProfile() {
  const id = await myId();
  return ok(await supabase.from('profiles').select('*').eq('id', id).single());
}
