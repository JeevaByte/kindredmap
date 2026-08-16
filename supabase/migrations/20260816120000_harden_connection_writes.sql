-- Harden connection writes.
--
-- Problem 1: the "initiator can create connections" policy constrains who may
-- insert, but never constrains WHAT status they insert. connections_guard_update
-- is a BEFORE UPDATE trigger, so it never sees an INSERT. A registered member
-- could therefore insert a row with status = 'confirmed' directly and fabricate
-- a mutual connection with anyone -- defeating the confirmation handshake the
-- whole product rests on ("Only confirmed meets show up here").
--
-- Problem 2: fun_facts_about() returns fun facts attached to PENDING
-- connections. A stranger could log a one-sided 'know' connection with
-- arbitrary text and have it render anonymously on the target's card
-- immediately, with no confirmation and no attribution.

-- 1. A new connection must always start life as pending, unconfirmed.
--    We raise rather than silently coerce so that a client bug (or an abuse
--    attempt) is loud instead of invisible. The legitimate client path omits
--    both columns and picks up the column defaults, so it is unaffected.
create or replace function public.connections_guard_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from 'pending'::public.connection_status then
    raise exception 'A connection must be created as pending; it is confirmed by the other person';
  end if;

  if new.confirmed_at is not null then
    raise exception 'confirmed_at is set by the database when the other person confirms';
  end if;

  -- The initiator must be one of the two participants. This duplicates the RLS
  -- policy on purpose: the trigger also covers service-role and SQL-editor
  -- writes, which bypass RLS entirely.
  if new.initiated_by is distinct from new.user_a_id
     and new.initiated_by is distinct from new.user_b_id then
    raise exception 'The initiator must be one of the two people in the connection';
  end if;

  return new;
end;
$$;

drop trigger if exists connections_guard_insert on public.connections;
create trigger connections_guard_insert
before insert on public.connections
for each row execute function public.connections_guard_insert();

-- 2. Defence in depth at the policy layer. For INSERT, Postgres evaluates the
--    WITH CHECK expression after BEFORE ROW triggers have run, so this is
--    belt-and-braces alongside the trigger above rather than a replacement.
drop policy if exists "initiator can create connections" on public.connections;
create policy "initiator can create connections"
  on public.connections for insert to authenticated
  with check (
    auth.uid() = initiated_by
    and (auth.uid() = user_a_id or auth.uid() = user_b_id)
    and public.is_registered(auth.uid())
    and status = 'pending'::public.connection_status
    and confirmed_at is null
  );

-- 3. Fun facts only become visible once the connection is mutually confirmed.
--    Same signature and grants as before; only the WHERE clause changes.
create or replace function public.fun_facts_about(_target uuid)
returns table (fun_fact text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.fun_fact, c.created_at
  from public.connections c
  where (c.user_a_id = _target or c.user_b_id = _target)
    and c.initiated_by <> _target
    and c.status = 'confirmed'::public.connection_status
    and c.fun_fact is not null
    and length(btrim(c.fun_fact)) > 0
  order by c.created_at desc
$$;

revoke all on function public.fun_facts_about(uuid) from public;
revoke all on function public.fun_facts_about(uuid) from anon;
grant execute on function public.fun_facts_about(uuid) to authenticated;

-- 4. profile_is_complete() was missed by the earlier privilege-hardening
--    migrations, which revoked every other function from PUBLIC.
revoke all on function public.profile_is_complete(public.profiles) from public;
revoke all on function public.profile_is_complete(public.profiles) from anon;

-- 5. Supporting indexes for the columns filtered on every render.
create index if not exists connections_initiated_by_idx
  on public.connections (initiated_by);

create index if not exists connections_status_idx
  on public.connections (status);
