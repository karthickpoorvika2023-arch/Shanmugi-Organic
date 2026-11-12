-- LOCAL ONLY. Grant CMS publishing to explicitly approved users, never everyone with a session.
CREATE FUNCTION public.is_local_content_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.ownpay_payment_admins
                 WHERE user_id = (select auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.is_local_content_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_local_content_admin() TO authenticated;
GRANT INSERT, UPDATE ON public.site_content TO authenticated;
CREATE POLICY content_admin_insert ON public.site_content FOR INSERT TO authenticated
  WITH CHECK ((select public.is_local_content_admin()));
CREATE POLICY content_admin_update ON public.site_content FOR UPDATE TO authenticated
  USING ((select public.is_local_content_admin()))
  WITH CHECK ((select public.is_local_content_admin()));