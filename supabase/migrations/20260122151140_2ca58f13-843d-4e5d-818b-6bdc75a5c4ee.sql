-- Add unique constraint on (user_id, url) for tab_activity table
-- This is required for the upsert operation in tabs-sync edge function
ALTER TABLE public.tab_activity 
ADD CONSTRAINT tab_activity_user_url_unique UNIQUE (user_id, url);