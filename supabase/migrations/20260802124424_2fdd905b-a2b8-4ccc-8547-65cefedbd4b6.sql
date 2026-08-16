ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS fun_fact text;

CREATE OR REPLACE FUNCTION public.fun_facts_about(_target uuid)
RETURNS TABLE (fun_fact text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select c.fun_fact, c.created_at
  from public.connections c
  where (c.user_a_id = _target or c.user_b_id = _target)
    and c.initiated_by <> _target
    and c.fun_fact is not null
    and length(btrim(c.fun_fact)) > 0
  order by c.created_at desc
$$;

GRANT EXECUTE ON FUNCTION public.fun_facts_about(uuid) TO authenticated;