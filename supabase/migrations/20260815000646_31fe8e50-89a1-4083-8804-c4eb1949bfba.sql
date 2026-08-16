-- 1. Registration state enum
create type public.registration_status as enum ('incomplete', 'complete');

-- 2. Column on profiles
alter table public.profiles
  add column registration_status public.registration_status not null default 'incomplete';

-- 3. Derivation helper: required fields for a complete registration
create or replace function public.profile_is_complete(_p public.profiles)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(length(btrim(_p.name)), 0) > 0
     and coalesce(length(btrim(_p.avatar_url)), 0) > 0
     and coalesce(length(btrim(_p.building_what)), 0) > 0
     and coalesce(length(btrim(_p.building_for)), 0) > 0
     and coalesce(length(btrim(_p.building_so)), 0) > 0
     and coalesce(length(btrim(_p.area)), 0) > 0
$$;

-- 4. Trigger keeps registration_status (and legacy onboarded) authoritative
create or replace function public.profiles_set_registration_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.profile_is_complete(new) then
    new.registration_status := 'complete'::public.registration_status;
    new.onboarded := true;
  else
    new.registration_status := 'incomplete'::public.registration_status;
    new.onboarded := false;
  end if;
  return new;
end;
$$;

create trigger profiles_set_registration_status
  before insert or update on public.profiles
  for each row execute function public.profiles_set_registration_status();

-- 5. Backfill existing rows (trigger computes the value)
update public.profiles set name = name;

-- 6. Registration check usable from RLS
create or replace function public.is_registered(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id
      and registration_status = 'complete'::public.registration_status
  )
$$;

-- 7. Gate connection writes on completed registration
drop policy if exists "initiator can create connections" on public.connections;
create policy "initiator can create connections"
  on public.connections for insert to authenticated
  with check (
    auth.uid() = initiated_by
    and (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and public.is_registered(auth.uid())
  );

drop policy if exists "recipient can confirm connections" on public.connections;
create policy "recipient can confirm connections"
  on public.connections for update to authenticated
  using (
    (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and auth.uid() <> initiated_by
    and public.is_registered(auth.uid())
  )
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- 8. Indexes
create unique index if not exists profiles_phone_unique_idx
  on public.profiles (lower(btrim(phone)))
  where phone is not null and btrim(phone) <> '';

create index if not exists profiles_registration_status_idx
  on public.profiles (registration_status);