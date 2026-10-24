-- Run this once in Supabase > SQL Editor > New query > Run (after schema.sql).
-- Lets students see how many staff are on duty without being able to read other people's profiles.
create or replace function public.staff_on_duty_count() returns int
language sql stable security definer set search_path = public as
$$ select count(*)::int from public.profiles where role = 'staff' and on_duty and status = 'active' $$;

grant execute on function public.staff_on_duty_count() to authenticated;
