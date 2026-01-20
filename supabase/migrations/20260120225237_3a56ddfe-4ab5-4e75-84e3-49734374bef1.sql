-- Add DELETE policy for api_keys to allow users to permanently delete their own API keys
CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);