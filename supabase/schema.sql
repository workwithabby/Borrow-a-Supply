-- Borrow-a-Supply: database schema for Supabase.
-- Run this whole file once in Supabase > SQL Editor > New query > Run.

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  student_id text unique,
  email text not null,
  role text not null default 'user' check (role in ('user','staff','admin')),
  status text not null default 'active' check (status in ('active','suspended')),
  program text not null default '',
  shift text not null default '',
  on_duty boolean not null default false,
  avatar text,
  prefs jsonb not null default '{"reservations":true,"reminders":true,"announcements":true}',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default 'package'
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id),
  name text not null,
  description text not null default '',
  fee numeric not null check (fee > 0),
  total_stock int not null default 0 check (total_stock >= 0),
  available_stock int not null default 0 check (available_stock >= 0),
  damaged_stock int not null default 0 check (damaged_stock >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  image text,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  room_hours text not null default 'Mon to Sat, 8:00 AM to 5:00 PM',
  room_location text not null default 'Borrow Room, Ground Floor, Main Building',
  hold_minutes int not null default 15 check (hold_minutes between 5 and 60),
  late_fee_per_hour numeric not null default 10 check (late_fee_per_hour >= 0),
  max_active_rentals int not null default 2 check (max_active_rentals >= 1)
);
insert into public.settings (id) values (1);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  item_id uuid not null references public.items(id),
  qty int not null default 1 check (qty > 0),
  sessions int not null default 1 check (sessions > 0),
  status text not null default 'reserved'
    check (status in ('reserved','active','overdue','returned','cancelled','expired')),
  code text not null unique,
  reserved_at timestamptz not null default now(),
  picked_up_at timestamptz,
  due_at timestamptz not null,
  returned_at timestamptz,
  fee numeric not null default 0,
  late_fee numeric not null default 0,
  pay_method text not null default 'cash',
  paid boolean not null default false,
  condition text,
  note text not null default '',
  handled_by uuid references public.profiles(id)
);
create index on public.rentals (user_id, status);
create index on public.rentals (status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ============ HELPERS ============
create function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create function public.notify(p_user uuid, p_title text, p_body text) returns void
language sql security definer set search_path = public as
$$ insert into public.notifications (user_id, title, body) values (p_user, p_title, p_body) $$;

-- Creates a profile row whenever someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, student_id)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          nullif(new.raw_user_meta_data->>'student_id', ''));
  perform public.notify(new.id, 'Welcome', 'Reserve an item and show your QR code at the Borrow Room.');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Stops people from changing their own role or status.
create function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(), 'admin') <> 'admin' then
    new.role := old.role; new.status := old.status; new.on_duty := old.on_duty;
    new.shift := old.shift; new.email := old.email;
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles
for each row execute function public.protect_profile();

-- ============ RENTAL FUNCTIONS (safe when many people use the app at once) ============
-- Expires old holds and flags late rentals. The app calls this when it opens.
create function public.sweep_rentals() returns void
language plpgsql security definer set search_path = public as $$
declare hold int; r record;
begin
  select hold_minutes into hold from public.settings where id = 1;
  for r in select * from public.rentals
           where status = 'reserved' and reserved_at + make_interval(mins => hold) < now() for update loop
    update public.rentals set status = 'expired' where id = r.id;
    update public.items set available_stock = available_stock + r.qty where id = r.item_id;
  end loop;
  update public.rentals set status = 'overdue' where status = 'active' and due_at < now();
end $$;

create function public.reserve_item(p_item uuid, p_qty int default 1, p_sessions int default 1, p_pay text default 'cash')
returns public.rentals language plpgsql security definer set search_path = public as $$
declare me public.profiles; it public.items; s public.settings; open_n int; rec public.rentals; c text;
begin
  perform public.sweep_rentals();
  select * into me from public.profiles where id = auth.uid();
  if me.role <> 'user' then raise exception 'Only students can reserve items.'; end if;
  select * into s from public.settings where id = 1;
  select count(*) into open_n from public.rentals where user_id = me.id and status in ('reserved','active','overdue');
  if open_n >= s.max_active_rentals then
    raise exception 'You can only have % open rentals at a time. Return or cancel one first.', s.max_active_rentals;
  end if;
  select * into it from public.items where id = p_item and status = 'active' for update;
  if not found then raise exception 'This item is not available.'; end if;
  if it.available_stock < p_qty then raise exception 'Sorry, there is not enough stock left.'; end if;
  update public.items set available_stock = available_stock - p_qty where id = p_item;
  loop
    c := 'BAS-' || (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random()*31)::int, 1), '')
                    from generate_series(1,4));
    exit when not exists (select 1 from public.rentals where code = c);
  end loop;
  insert into public.rentals (user_id, item_id, qty, sessions, code, due_at, fee, pay_method, paid)
  values (me.id, p_item, p_qty, p_sessions, c,
          now() + make_interval(mins => s.hold_minutes + p_sessions * 120),
          it.fee * p_qty * p_sessions, p_pay, p_pay = 'ewallet')
  returning * into rec;
  perform public.notify(me.id, 'Reservation confirmed',
    it.name || ' is held for ' || s.hold_minutes || ' minutes. Show your QR at the room.');
  perform public.notify(p.id, 'New reservation', me.full_name || ' reserved ' || it.name || '.')
    from public.profiles p where p.role = 'staff' and p.on_duty;
  return rec;
end $$;

create function public.cancel_reservation(p_rental uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals;
begin
  select * into r from public.rentals where id = p_rental and user_id = auth.uid() for update;
  if not found then raise exception 'We could not find that reservation.'; end if;
  if r.status <> 'reserved' then raise exception 'Only reserved items can be cancelled.'; end if;
  update public.rentals set status = 'cancelled' where id = p_rental;
  update public.items set available_stock = available_stock + r.qty where id = r.item_id;
end $$;

create function public.confirm_pickup(p_rental uuid, p_paid boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals; it public.items;
begin
  if public.my_role() not in ('staff','admin') then raise exception 'You do not have access to this.'; end if;
  perform public.sweep_rentals();
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'We could not find that reservation.'; end if;
  if r.status = 'expired' then raise exception 'This reservation expired. Ask the student to reserve again.'; end if;
  if r.status <> 'reserved' then raise exception 'This rental is already %.', r.status; end if;
  update public.rentals set status = 'active', picked_up_at = now(),
    due_at = now() + make_interval(mins => r.sessions * 120), paid = p_paid or r.paid, handled_by = auth.uid()
  where id = p_rental;
  select * into it from public.items where id = r.item_id;
  perform public.notify(r.user_id, 'Ready, enjoy', it.name || ' is yours. Please return it before time runs out.');
end $$;

create function public.confirm_return(p_rental uuid, p_condition text default 'good', p_note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare r public.rentals; it public.items; s public.settings; late numeric := 0;
begin
  if public.my_role() not in ('staff','admin') then raise exception 'You do not have access to this.'; end if;
  select * into r from public.rentals where id = p_rental for update;
  if not found then raise exception 'We could not find that rental.'; end if;
  if r.status not in ('active','overdue') then raise exception 'This rental is %, so it cannot be returned.', r.status; end if;
  select * into s from public.settings where id = 1;
  select * into it from public.items where id = r.item_id for update;
  if now() > r.due_at then
    late := ceil(extract(epoch from (now() - r.due_at)) / 3600) * s.late_fee_per_hour * r.qty;
  end if;
  update public.rentals set status = 'returned', returned_at = now(), condition = p_condition,
    note = trim(p_note), late_fee = late, handled_by = auth.uid() where id = p_rental;
  if p_condition = 'good' then
    update public.items set available_stock = available_stock + r.qty where id = r.item_id;
  else
    update public.items set damaged_stock = damaged_stock + r.qty where id = r.item_id;
    perform public.notify(a.id, 'Damaged item flagged', it.name || ' came back damaged.')
      from public.profiles a where a.role = 'admin';
  end if;
  perform public.notify(r.user_id, 'Return recorded', it.name || ' was returned. Thank you.');
end $$;

create function public.post_announcement(p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'You do not have access to this.'; end if;
  insert into public.notifications (user_id, title, body)
  select id, trim(p_title), trim(p_body) from public.profiles where status = 'active';
end $$;

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.items         enable row level security;
alter table public.settings      enable row level security;
alter table public.rentals       enable row level security;
alter table public.notifications enable row level security;

-- profiles: you see yourself; staff and admin see everyone; you edit yourself; admin edits anyone
create policy "profiles read"   on public.profiles for select using (id = auth.uid() or public.my_role() in ('staff','admin'));
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.my_role() = 'admin');
create policy "profiles delete" on public.profiles for delete using (public.my_role() = 'admin');

-- catalog: everyone logged in can read, admin writes (staff can adjust stock)
create policy "categories read"  on public.categories for select using (auth.uid() is not null);
create policy "categories admin" on public.categories for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "items read"        on public.items for select using (auth.uid() is not null);
create policy "items admin"       on public.items for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy "items staff stock" on public.items for update using (public.my_role() = 'staff');
create policy "settings read"     on public.settings for select using (true);  -- the Rules page is public
create policy "settings admin"    on public.settings for update using (public.my_role() = 'admin');

-- rentals: students see their own, staff and admin see all. Changes only go through the functions above.
create policy "rentals read" on public.rentals for select using (user_id = auth.uid() or public.my_role() in ('staff','admin'));

-- notifications: only your own
create policy "notifications read"   on public.notifications for select using (user_id = auth.uid());
create policy "notifications update" on public.notifications for update using (user_id = auth.uid());

grant execute on function public.sweep_rentals(), public.reserve_item(uuid,int,int,text), public.cancel_reservation(uuid),
  public.confirm_pickup(uuid,boolean), public.confirm_return(uuid,text,text), public.post_announcement(text,text) to authenticated;

-- ============ STARTER DATA ============
insert into public.categories (name, icon) values
  ('Calculators','calculator'), ('Lab Coats','shirt'), ('Drafting','ruler'), ('Umbrellas','umbrella'), ('Others','package');

insert into public.items (category_id, name, description, fee, total_stock, available_stock)
select c.id, v.name, v.descr, v.fee, v.n, v.n from (values
  ('Calculators','Scientific Calculator','Casio-style scientific calculator. Good for exams and problem sets.',20,8),
  ('Calculators','Graphing Calculator','Graphing calculator for advanced math and engineering classes.',30,5),
  ('Lab Coats','Lab Coat','White lab coat for lab sessions. Sizes S, M, L and XL. Tell the staff your size.',25,6),
  ('Drafting','T-Square','Wooden T-square for drafting plates.',15,5),
  ('Drafting','Ruler Set','Straight ruler, triangle and curve in one set.',15,8),
  ('Drafting','Drafting Set','Full drafting set with compass, divider and pens.',30,2),
  ('Drafting','Compass','Metal compass for drawing circles and arcs.',15,7),
  ('Drafting','Protractor','Clear 180 degree protractor.',15,9),
  ('Umbrellas','Folding Umbrella','Small folding umbrella that fits in your bag.',20,4),
  ('Umbrellas','Large Umbrella','Large umbrella for heavy rain.',25,5),
  ('Others','Extension Cord','3-socket extension cord, 3 meters long.',20,4),
  ('Others','Flash Drive','32 GB flash drive for printing and file transfer.',25,6)
) as v(cat, name, descr, fee, n) join public.categories c on c.name = v.cat;
