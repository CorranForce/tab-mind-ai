
-- First delete any orphaned tickets with NULL user_id (shouldn't exist but safety)
DELETE FROM public.support_tickets WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent unprotected tickets
ALTER TABLE public.support_tickets ALTER COLUMN user_id SET NOT NULL;
