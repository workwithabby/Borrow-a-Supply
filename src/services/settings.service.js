// Room settings and announcements.
import { supabase, run, ok, fail } from './supabase.js';

const withRule = (s) => ({ ...s, late_fee_rule: `₱${s.late_fee_per_hour} for every extra hour` });

export const getSettings = () =>
  run(async () => withRule(ok(await supabase.from('settings').select('*').eq('id', 1).single())));

export const updateSettings = (patch) =>
  run(async () => {
    const hold = Number(patch.hold_minutes);
    const max = Number(patch.max_active_rentals);
    if (!(hold >= 5 && hold <= 60)) fail('Hold time must be between 5 and 60 minutes.', 'invalid');
    if (!(max >= 1)) fail('Allow at least 1 rental per student.', 'invalid');
    const row = {
      room_hours: patch.room_hours.trim(),
      room_location: patch.room_location.trim(),
      hold_minutes: hold,
      max_active_rentals: max,
      late_fee_per_hour: Number(patch.late_fee_per_hour),
    };
    return withRule(ok(await supabase.from('settings').update(row).eq('id', 1).select().single()));
  });

// Sends a notification to every active person.
export const postAnnouncement = ({ title, body }) =>
  run(async () => {
    if (!title.trim() || !body.trim()) fail('Add a title and a message.', 'invalid');
    ok(await supabase.rpc('post_announcement', { p_title: title, p_body: body }));
  });
