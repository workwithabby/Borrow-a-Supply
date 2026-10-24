-- Run once in Supabase > SQL Editor > New query > Run.
-- Only school emails (@tip.edu.ph) can create an account, even if someone skips the app and calls the API directly.
create or replace function public.enforce_school_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.email, '')) not like '%@tip.edu.ph' then
    raise exception 'Only school emails (name@tip.edu.ph) can sign up.';
  end if;
  return new;
end $$;

drop trigger if exists enforce_school_email on auth.users;
create trigger enforce_school_email before insert on auth.users
for each row execute function public.enforce_school_email();
