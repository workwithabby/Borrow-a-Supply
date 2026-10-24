-- SECURITY FIX. Run once in Supabase > SQL Editor > New query > Run.
-- Before this, someone who was not logged in could still call some database functions.

-- 1. A person who is not logged in has no role, so every role check fails safely.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select coalesce((select role from public.profiles where id = auth.uid()), 'none') $$;

-- 2. Role changes are only blocked for logged-in non-admins. SQL Editor edits (no login) still work.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and public.my_role() <> 'admin' then
    new.role := old.role; new.status := old.status; new.on_duty := old.on_duty;
    new.shift := old.shift; new.email := old.email;
  end if;
  return new;
end $$;

-- 3. Only logged-in people can run the app functions. Internal helpers cannot be called from the app at all.
revoke execute on function public.sweep_rentals() from public, anon;
revoke execute on function public.reserve_item(uuid, int, int, text) from public, anon;
revoke execute on function public.cancel_reservation(uuid) from public, anon;
revoke execute on function public.confirm_pickup(uuid, boolean) from public, anon;
revoke execute on function public.confirm_return(uuid, text, text) from public, anon;
revoke execute on function public.post_announcement(text, text) from public, anon;
revoke execute on function public.admin_reset_password(uuid, text) from public, anon;
revoke execute on function public.staff_on_duty_count() from public, anon;
revoke execute on function public.notify(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.my_role() from public, anon;

grant execute on function public.sweep_rentals() to authenticated;
grant execute on function public.reserve_item(uuid, int, int, text) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.confirm_pickup(uuid, boolean) to authenticated;
grant execute on function public.confirm_return(uuid, text, text) to authenticated;
grant execute on function public.post_announcement(text, text) to authenticated;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
grant execute on function public.staff_on_duty_count() to authenticated;
grant execute on function public.my_role() to authenticated;

-- 4. Remove the test announcement that was sent while checking this.
delete from public.notifications where title = 'x' and body = 'y';
