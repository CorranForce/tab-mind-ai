-- Add custom_price column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN custom_price numeric(10,2) DEFAULT NULL;