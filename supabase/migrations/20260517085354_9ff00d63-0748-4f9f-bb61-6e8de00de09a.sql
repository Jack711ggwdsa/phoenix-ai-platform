-- Restore execute permission on has_role so RLS policies that call it work for signed-in users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- client_is_active is also referenced by policies / app code; restore for authenticated.
GRANT EXECUTE ON FUNCTION public.client_is_active(uuid) TO authenticated, service_role;