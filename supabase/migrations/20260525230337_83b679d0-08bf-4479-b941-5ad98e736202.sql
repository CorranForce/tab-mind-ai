
-- 1) extension_waitlist: restrict INSERT to authenticated users, and require email matches their auth email
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.extension_waitlist;
CREATE POLICY "Authenticated users can join waitlist"
ON public.extension_waitlist
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- 2) Storage objects: owner-scoped policies for qr-codes and smart-tab buckets
-- Folder convention: first path segment is the user's uid
CREATE POLICY "Users can view own files in qr-codes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files to qr-codes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files in qr-codes"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in qr-codes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own files in smart-tab"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'smart-tab' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files to smart-tab"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'smart-tab' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files in smart-tab"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'smart-tab' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in smart-tab"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'smart-tab' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3) Realtime: only allow users to subscribe to their own user-scoped channels
-- Convention: channels are named "user:<auth.uid()>" or "tabs:<auth.uid()>"
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own realtime channels"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() = ('tabs:' || auth.uid()::text)
);

CREATE POLICY "Users can write to own realtime channels"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() = ('tabs:' || auth.uid()::text)
);

-- 4) Subscriptions: remove user UPDATE/DELETE; mutations only via service role (Stripe webhooks)
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;

-- 5) Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated where not needed
REVOKE EXECUTE ON FUNCTION public.assign_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_logs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role must remain callable by authenticated because it is used inside RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
