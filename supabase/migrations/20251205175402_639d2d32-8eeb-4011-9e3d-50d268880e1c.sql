-- Add column to track if trial expiry reminder has been sent
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_reminder_sent boolean DEFAULT false;