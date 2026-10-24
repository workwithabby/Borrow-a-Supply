// Students and staff, managed by the admin. Row level security lets only staff and admin read other profiles.
import { supabase, run, ok, fail, myId } from './supabase.js';
import { isolatedClient, isSchoolEmail } from './auth.service.js';

export const listStudents = ({ q = '' } = {}) =>
  run(async () => {
    let query = supabase.from('profiles').select('*').eq('role', 'user').order('full_name');
    const term = q.trim();
    if (term) query = query.or(`full_name.ilike.%${term}%,student_id.ilike.%${term}%`);
    return ok(await query);
  });

export const listStaff = () =>
  run(async () => ok(await supabase.from('profiles').select('*').in('role', ['staff', 'admin']).order('full_name')));

// Counts staff on duty. Uses a database function so students can see the number without seeing profiles.
export const staffOnDuty = () =>
  run(async () => ok(await supabase.rpc('staff_on_duty_count')) || 0);

export const getProfile = (id) =>
  run(async () => {
    const p = ok(await supabase.from('profiles').select('*').eq('id', id).maybeSingle());
    if (!p) fail('We could not find that person.', 'not_found');
    return p;
  });

// Creates a login for the new staff member with a separate client, so the admin stays logged in.
export const addStaff = ({ full_name, email, password, shift }) =>
  run(async () => {
    const mail = (email || '').trim().toLowerCase();
    if (!isSchoolEmail(mail)) fail('Use a school email (name@tip.edu.ph).', 'bad_email');
    const { data, error } = await isolatedClient().auth.signUp({
      email: mail, password, options: { data: { full_name: full_name.trim() } },
    });
    if (error) {
      if (/already registered|already been registered/i.test(error.message)) fail('This email already has an account.', 'email_taken');
      throw error;
    }
    if (!data.user || data.user.identities?.length === 0) fail('This email already has an account.', 'email_taken');
    return ok(await supabase.from('profiles').update({ role: 'staff', shift: (shift || '').trim() }).eq('id', data.user.id).select().single());
  });

export const updateShift = (id, shift) =>
  run(async () => ok(await supabase.from('profiles').update({ shift: (shift || '').trim() }).eq('id', id).select().single()));

// Needs patch-4.sql. Sets a new password without any email.
export const resetUserPassword = (id, password) =>
  run(async () => ok(await supabase.rpc('admin_reset_password', { p_user: id, p_password: password })));

export const changeRole = (id, role) =>
  run(async () => {
    if (id === (await myId())) fail('You cannot change your own role.', 'invalid');
    return ok(await supabase.from('profiles').update({ role }).eq('id', id).select().single());
  });

// Takes away staff access but keeps the history of what they handled.
export const removeStaff = (id) =>
  run(async () => {
    ok(await supabase.from('profiles').update({ role: 'user', status: 'suspended', on_duty: false }).eq('id', id));
  });

const setStatus = (id, status) =>
  run(async () => {
    if (id === (await myId())) fail('You cannot suspend yourself.', 'invalid');
    return ok(await supabase.from('profiles').update({ status }).eq('id', id).select().single());
  });

export const suspendUser = (id) => setStatus(id, 'suspended');
export const restoreUser = (id) => setStatus(id, 'active');
