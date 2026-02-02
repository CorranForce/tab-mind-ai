
# Fix SetupIntent Error and Update Pro Price to $37

## Problem Analysis

### Issue 1: SetupIntent Error
The error "No such setupintent: 'seti_1SspITKq904QPKp475M502Yr'" indicates a **key mode mismatch** between your frontend and backend:
- Frontend uses: `pk_live_51J3qRXRbxIeMPlL...` (LIVE mode)
- Backend's `STRIPE_SECRET_KEY` may be using a TEST mode key

When a SetupIntent is created with a test secret key but confirmed with a live publishable key (or vice versa), Stripe returns "No such setupintent" because the intent doesn't exist in that mode.

### Issue 2: Pro Price Update
Current Pro price: $12/month
Requested Pro price: $37/month

---

## Solution

### Part 1: Fix the Key Mismatch

**Action Required from You:**
Verify your `STRIPE_SECRET_KEY` secret matches the mode of your publishable key:
- If using `pk_live_...`, the secret key must be `sk_live_...`
- If using `pk_test_...`, the secret key must be `sk_test_...`

To update the secret key if needed:
1. Go to your Stripe Dashboard > Developers > API Keys
2. Copy the live mode Secret Key (starts with `sk_live_`)
3. I'll provide a button to update the secret

### Part 2: Update Pro Price to $37

1. **Create new Stripe price** at $37/month (3700 cents) for the existing Pro product
2. **Update `src/hooks/useSubscription.ts`** - Replace the Pro price_id with the new one
3. **Update `src/components/pricing/PricingCards.tsx`** - Change displayed price from "$12" to "$37"

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useSubscription.ts` | Update `STRIPE_PRODUCTS.pro.price_id` to new price |
| `src/components/pricing/PricingCards.tsx` | Change Pro plan price display from "$12" to "$37" |

---

## Technical Details

### New Stripe Price Creation
- Product: `prod_TVVAI2BQPBNmIf` (existing Pro product)
- Amount: $37.00 (3700 cents)
- Interval: Monthly recurring
- Currency: USD

### Code Changes

**useSubscription.ts:**
```typescript
export const STRIPE_PRODUCTS = {
  pro: {
    price_id: "price_NEW_ID_HERE", // New $37 price
    product_id: "prod_TVVAI2BQPBNmIf",
  },
  // ... enterprise stays same
};
```

**PricingCards.tsx:**
```typescript
{
  name: "Pro",
  price: "$37",  // Changed from "$12"
  // ...
}
```

---

## Before Approval

Please confirm:
1. Do you want me to update your `STRIPE_SECRET_KEY` to a live mode key? (If so, I'll show a button to enter it)
2. Should I proceed with creating the new $37 price and updating the code?
