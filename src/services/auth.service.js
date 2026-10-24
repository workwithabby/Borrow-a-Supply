// Auth service. Every function returns { data, error }.
import { createClient } from '@supabase/supabase-js';
import { supabase, run, fail, myId, myProfile } from './supabase.js';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Only school emails can sign up.
export const SCHOOL_DOMAIN = '@tip.edu.ph';
// Only @tip.edu.ph emails can sign up. Also enforced in the database by supabase/patch-2.sql.
export const REQUIRE_SCHOOL_EMAIL = true;
export const isSchoolEmail = (email) => !REQUIRE_SCHOOL_EMAIL || (email || '').trim().toLowerCase().endsWith(SCHOOL_DOMAIN);

export function validatePassword(pw) {
  return PASSWORD_RULE.test(pw || '');
}

// Restores the logged-in person when the app opens.
export const getSession = () =>
  run(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const { data: p, error } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
    if (error || !p || p.status === 'suspended') {
      await supabase.auth.signOut();
      return null;
    }
    return p;
  });

// With "Confirm email" off, sign up logs the person in right away and returns their profile.
export const signUp = ({ full_name, student_id, email, password }) =>
  run(async () => {
    const mail = email.trim().toLowerCase();
    if (!isSchoolEmail(mail)) fail('Please use your school email (name@tip.edu.ph).', 'bad_email');
    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password,
      options: { data: { full_name: full_name.trim(), student_id: student_id.trim() } },
    });
    if (error) {
      if (/already registered|already been registered/i.test(error.message)) fail('This email already has an account.', 'email_taken');
      if (/database error/i.test(error.message)) fail('This student ID is already registered.', 'id_taken');
      if (/rate limit|too many/i.test(error.message)) fail('Too many tries. Please wait a minute and try again.', 'rate_limit');
      throw error;
    }
    // An existing email comes back with no identities and no error.
    if (data.user && data.user.identities?.length === 0) fail('This email already has an account.', 'email_taken');
    if (!data.session) return { email: mail, profile: null };
    return { email: mail, profile: await myProfile() };
  });

export const verifyEmail = ({ email, code }) =>
  run(async () => {
    if (!/^\d{6}$/.test(code || '')) fail('Enter the 6-digit code.', 'bad_code');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
    if (error) fail('That code did not work. Ask for a new one.', 'bad_code');
    return myProfile();
  });

export const resendCode = ({ email }) =>
  run(async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return { email };
  });

export const logIn = ({ email, password }) =>
  run(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: (email || '').trim().toLowerCase(), password });
    if (error) {
      if (/not confirmed/i.test(error.message)) fail('Please verify your email first.', 'unverified');
      if (/invalid login/i.test(error.message)) fail('Email or password is not right. Please try again.', 'bad_login');
      throw error;
    }
    const p = await myProfile();
    if (p.status === 'suspended') {
      await supabase.auth.signOut();
      fail('This account is suspended. Please visit the Borrow Room.', 'suspended');
    }
    return p;
  });

export const logOut = () =>
  run(async () => {
    await supabase.auth.signOut();
  });

// Sends a 6-digit code (set the "Reset password" email template to {{ .Token }}).
export const forgotPassword = ({ email }) =>
  run(async () => {
    const mail = (email || '').trim().toLowerCase();
    await supabase.auth.resetPasswordForEmail(mail); // same answer whether the email exists or not
    return { email: mail };
  });

export const resetPassword = ({ email, code, password }) =>
  run(async () => {
    if (!/^\d{6}$/.test(code || '')) fail('Enter the 6-digit code.', 'bad_code');
    if (!validatePassword(password)) fail('Use at least 8 characters with a letter and a number.', 'weak_password');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (error) fail('That code did not work. Ask for a new one.', 'bad_code');
    const upd = await supabase.auth.updateUser({ password });
    if (upd.error) throw upd.error;
    await supabase.auth.signOut();
  });

export const updateProfile = ({ full_name, student_id = '', avatar }) =>
  run(async () => {
    const id = await myId();
    const me = await myProfile();
    const patch = { full_name: full_name.trim() };
    if (me.role === 'user') patch.student_id = student_id.trim() || null;
    if (avatar !== undefined) patch.avatar = avatar || null;
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
    if (error) {
      if (error.code === '23505') fail('This student ID is already registered.', 'id_taken');
      throw error;
    }
    return data;
  });

export const changePassword = ({ current, next }) =>
  run(async () => {
    const me = await myProfile();
    const check = await supabase.auth.signInWithPassword({ email: me.email, password: current });
    if (check.error) fail('Your current password is not right.', 'bad_password');
    if (!validatePassword(next)) fail('Use at least 8 characters with a letter and a number.', 'weak_password');
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw error;
  });

// Lets the admin create a login without touching the admin's own session.
export function isolatedClient() {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
