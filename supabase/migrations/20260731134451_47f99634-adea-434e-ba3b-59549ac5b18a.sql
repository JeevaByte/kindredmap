create type public.connection_type as enum ('know','met_online','met_in_person');
create type public.connection_status as enum ('pending','confirmed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  area text,
  building_line text,
  building_what text,
  building_for text,
  building_so text,
  linkedin_url text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "members can view profiles" on public.profiles
  for select to authenticated using (true);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  type public.connection_type not null,
  status public.connection_status not null default 'pending',
  initiated_by uuid not null references public.profiles(id) on delete cascade,
  photo_url text,
  note text,
  meet_date date,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint different_users check (user_a_id <> user_b_id)
);

create index connections_user_a_idx on public.connections (user_a_id);
create index connections_user_b_idx on public.connections (user_b_id);

grant select, insert, update, delete on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;

create policy "participants can view connections" on public.connections
  for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "initiator can create connections" on public.connections
  for insert to authenticated
  with check (auth.uid() = initiated_by and (auth.uid() = user_a_id or auth.uid() = user_b_id));

create policy "recipient can confirm connections" on public.connections
  for update to authenticated
  using ((auth.uid() = user_a_id or auth.uid() = user_b_id) and auth.uid() <> initiated_by)
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "initiator can delete pending connections" on public.connections
  for delete to authenticated
  using (auth.uid() = initiated_by and status = 'pending');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();