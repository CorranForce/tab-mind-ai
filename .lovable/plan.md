
# Stripe Integration - Updated Configuration

## Stripe Account Details

The project is now connected to the correct Stripe account with the following products:

### Pro Plan - $37/month
- **Product ID**: `prod_TvKapBPJXyIQDa`
- **Price ID**: `price_1SxTvLPNua4i0s7ugjHNzsRH`
- **Amount**: $37.00/month

### Enterprise Plan - $99/month
- **Product ID**: `prod_TvKakcMbmBDlLQ`
- **Price ID**: `price_1SxTvMPNua4i0s7uI5ks6icg`
- **Amount**: $99.00/month

## Test Customer

- **Name**: Corran Force
- **Email**: corranforce+test@gmail.com
- **Customer ID**: `cus_TvKWQjkzVlFOqx`

## Files Updated

| File | Change |
|------|--------|
| `src/hooks/useSubscription.ts` | Updated `STRIPE_PRODUCTS` with new price/product IDs |
| `supabase/functions/check-subscription/index.ts` | Updated admin-granted product ID |
| `supabase/functions/create-checkout/index.ts` | Added fallback origin URL |

## Email Notifications

The `send-upgrade-email` edge function is triggered from the Dashboard when a user returns from successful checkout (`?checkout=success`). It sends a welcome email via Resend when a subscription is activated.
