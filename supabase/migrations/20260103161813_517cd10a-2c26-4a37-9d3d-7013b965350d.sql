-- Add INSERT policy for subscriptions table
-- This explicitly blocks direct user inserts while allowing system operations
-- Note: The handle_new_user trigger uses SECURITY DEFINER and bypasses RLS
-- Note: Edge functions using service_role key also bypass RLS
-- This policy makes the security posture explicit and satisfies security scans

CREATE POLICY "Only system can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (false);

-- This policy blocks all direct INSERT attempts from regular users
-- Legitimate subscription creation happens via:
-- 1. handle_new_user trigger (SECURITY DEFINER - bypasses RLS)
-- 2. Admin edge functions (service_role key - bypasses RLS)