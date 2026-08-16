revoke all on function public.handle_new_user() from public;
revoke all on function public.profiles_set_registration_status() from public;
revoke all on function public.connections_guard_update() from public, anon, authenticated;
revoke all on function public.is_registered(uuid) from public;
revoke all on function public.fun_facts_about(uuid) from public;
grant execute on function public.is_registered(uuid) to authenticated;
grant execute on function public.fun_facts_about(uuid) to authenticated;