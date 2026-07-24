-- Fix support_tickets RLS policies to prevent email exposure

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

-- Create new policy: Only authenticated users can create tickets (must match their user_id)
CREATE POLICY "Authenticated users can create their own tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create new policy: Users can only view their own tickets (requires authentication)
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);