REVOKE ALL ON FUNCTION public.fun_facts_about(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fun_facts_about(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fun_facts_about(uuid) TO authenticated;