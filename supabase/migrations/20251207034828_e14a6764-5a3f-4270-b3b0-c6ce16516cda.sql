-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.extension_waitlist;

-- Create a secure policy that only allows authenticated users to see their own entry
CREATE POLICY "Users can view their own waitlist entry" 
ON public.extension_waitlist 
FOR SELECT 
USING (auth.uid() = user_id);