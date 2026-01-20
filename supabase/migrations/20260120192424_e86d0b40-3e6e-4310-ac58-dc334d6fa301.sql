-- Remove sensitive card details from payment_methods table
-- Card details are fetched on-demand from Stripe API via get-payment-methods edge function
-- This reduces the attack surface if authentication tokens are compromised

ALTER TABLE public.payment_methods 
DROP COLUMN IF EXISTS card_brand,
DROP COLUMN IF EXISTS card_last4,
DROP COLUMN IF EXISTS card_exp_month,
DROP COLUMN IF EXISTS card_exp_year;