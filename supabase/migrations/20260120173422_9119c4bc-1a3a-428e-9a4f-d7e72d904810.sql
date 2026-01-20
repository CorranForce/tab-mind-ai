-- Add RLS policies for rate_limit_logs table
-- Only admins should be able to view rate limit logs
-- Only the system (service role) should be able to insert/delete logs

-- Policy: Admins can view all rate limit logs
CREATE POLICY "Admins can view rate limit logs"
ON public.rate_limit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: System can insert rate limit logs (using service role, not anon)
-- This is a restrictive policy that prevents client-side inserts
CREATE POLICY "System can insert rate limit logs"
ON public.rate_limit_logs
FOR INSERT
WITH CHECK (false);

-- Policy: System can delete rate limit logs (for cleanup function)
CREATE POLICY "System can delete rate limit logs"
ON public.rate_limit_logs
FOR DELETE
USING (false);