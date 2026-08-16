revoke all on function public.is_registered(uuid) from anon;
revoke all on function public.fun_facts_about(uuid) from anon;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.profiles_set_registration_status() from anon, authenticated;
grant execute on function public.is_registered(uuid) to authenticated;
grant execute on function public.fun_facts_about(uuid) to authenticated;