-- Add DELETE policy for subscriptions table
-- Allows users to delete their own subscription records
CREATE POLICY "Users can delete their own subscription"
ON public.subscriptions
FOR DELETE
USING (auth.uid() = user_id);