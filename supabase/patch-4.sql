-- Run once in Supabase > SQL Editor > New query > Run.
-- Lets an admin set a new password for someone who forgot theirs (no email needed).
create or replace function public.admin_reset_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if public.my_role() <> 'admin' then raise exception 'You do not have access to this.'; end if;
  if p_user = auth.uid() then raise exception 'Use Change password in your own Profile.'; end if;
  if length(coalesce(p_password, '')) < 8 or p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' then
    raise exception 'Use at least 8 characters with a letter and a number.';
  end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
  if not found then raise exception 'We could not find that person.'; end if;
  -- log them out everywhere so only the new password works
  delete from auth.sessions where user_id = p_user;
end $$;

grant execute on function public.admin_reset_password(uuid, text) to authenticated;
