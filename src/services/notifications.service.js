// Notifications for the logged-in person. Row level security keeps each person to their own.
import { supabase, run, ok, myId, myProfile } from './supabase.js';

const DEFAULT_PREFS = { reservations: true, reminders: true, announcements: true };

export const listNotifications = () =>
  run(async () => ok(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)));

export const unreadCount = () =>
  run(async () => {
    const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
    if (error) throw error;
    return count || 0;
  });

export const markRead = (id) => run(async () => ok(await supabase.from('notifications').update({ read: true }).eq('id', id)));

export const markAllRead = () =>
  run(async () => ok(await supabase.from('notifications').update({ read: true }).eq('user_id', await myId()).eq('read', false)));

export const getPrefs = () => run(async () => ({ ...DEFAULT_PREFS, ...((await myProfile()).prefs || {}) }));

export const setPrefs = (patch) =>
  run(async () => {
    const me = await myProfile();
    const prefs = { ...DEFAULT_PREFS, ...(me.prefs || {}), ...patch };
    ok(await supabase.from('profiles').update({ prefs }).eq('id', me.id));
    return prefs;
  });
