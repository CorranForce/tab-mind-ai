-- Add explicit denial policies for api_usage audit log immutability

-- Prevent users from updating audit logs
CREATE POLICY "Prevent direct updates to API usage"
ON public.api_usage
FOR UPDATE
USING (false);

-- Prevent users from deleting audit logs
CREATE POLICY "Prevent direct deletes of API usage"
ON public.api_usage
FOR DELETE
USING (false);