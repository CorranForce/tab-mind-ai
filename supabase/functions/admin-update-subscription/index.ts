import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-UPDATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: adminUser.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw new Error(`Role check error: ${roleError.message}`);
    if (!roleData) throw new Error("Unauthorized: Admin access required");
    logStep("Admin role verified");

    // Parse request body
    const { userId, action, billingDate, customPrice } = await req.json();
    if (!userId) throw new Error("userId is required");
    
    const validActions = ["grant_pro", "revoke_pro", "update_billing_date", "update_custom_price"];
    if (!action || !validActions.includes(action)) {
      throw new Error(`Invalid action. Must be one of: ${validActions.join(", ")}`);
    }
    logStep("Request parsed", { userId, action, billingDate, customPrice });

    // Get user's email for Stripe operations
    const { data: targetUser, error: targetUserError } = await supabaseClient.auth.admin.getUserById(userId);
    if (targetUserError) throw new Error(`Error fetching target user: ${targetUserError.message}`);
    const userEmail = targetUser.user?.email;
    logStep("Target user email", { email: userEmail });

    if (action === "grant_pro") {
      // Grant pro access - set to active with 100 year subscription
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "active",
          cancel_at_period_end: false,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: null,
        })
        .eq("user_id", userId);

      if (updateError) throw new Error(`Update error: ${updateError.message}`);
      logStep("Pro access granted", { userId });
      
    } else if (action === "revoke_pro") {
      // Revoke pro access - set back to expired
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "expired",
          cancel_at_period_end: false,
          current_period_start: null,
          current_period_end: null,
          trial_ends_at: null,
        })
        .eq("user_id", userId);

      if (updateError) throw new Error(`Update error: ${updateError.message}`);
      logStep("Pro access revoked", { userId });
      
    } else if (action === "update_billing_date") {
      if (!billingDate) throw new Error("billingDate is required for update_billing_date action");
      
      // Parse and validate the date
      const newBillingDate = new Date(billingDate);
      if (isNaN(newBillingDate.getTime())) {
        throw new Error("Invalid billingDate format");
      }
      
      // Update the billing/subscription end date
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          current_period_end: newBillingDate.toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw new Error(`Update error: ${updateError.message}`);
      logStep("Billing date updated", { userId, newBillingDate: newBillingDate.toISOString() });
      
    } else if (action === "update_custom_price") {
      if (!customPrice) throw new Error("customPrice is required for update_custom_price action");
      if (!userEmail) throw new Error("User email not found");
      
      const priceInCents = Math.round(parseFloat(customPrice) * 100);
      if (isNaN(priceInCents) || priceInCents <= 0) {
        throw new Error("Invalid custom price. Must be a positive number.");
      }
      logStep("Custom price in cents", { priceInCents });

      // Find or create Stripe customer
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        const newCustomer = await stripe.customers.create({ email: userEmail });
        customerId = newCustomer.id;
        logStep("Created new Stripe customer", { customerId });
      }

      // Get user's current subscription from database
      const { data: subData, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (subError) throw new Error(`Error fetching subscription: ${subError.message}`);

      // Create a custom price in Stripe
      const customStripePrice = await stripe.prices.create({
        unit_amount: priceInCents,
        currency: "usd",
        recurring: { interval: "month" },
        product: "prod_TVVAI2BQPBNmIf", // Use existing Pro product
        nickname: `Custom price for ${userEmail}`,
      });
      logStep("Created custom Stripe price", { priceId: customStripePrice.id });

      if (subData?.stripe_subscription_id) {
        // Update existing Stripe subscription with new price
        const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
        const subscriptionItemId = subscription.items.data[0]?.id;
        
        if (subscriptionItemId) {
          await stripe.subscriptions.update(subData.stripe_subscription_id, {
            items: [{
              id: subscriptionItemId,
              price: customStripePrice.id,
            }],
            proration_behavior: "none",
          });
          logStep("Updated Stripe subscription with custom price", { 
            subscriptionId: subData.stripe_subscription_id,
            newPriceId: customStripePrice.id 
          });
        }
        
        // Save custom price to database
        const { error: priceUpdateError } = await supabaseClient
          .from("subscriptions")
          .update({ custom_price: parseFloat(customPrice) })
          .eq("user_id", userId);
        
        if (priceUpdateError) {
          logStep("Error saving custom price to database", { error: priceUpdateError.message });
        } else {
          logStep("Custom price saved to database", { customPrice });
        }
      } else {
        // Create a new subscription with the custom price
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: customStripePrice.id }],
          payment_behavior: "default_incomplete",
        });
        
        // Update local database with new subscription and custom price
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            status: "active",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            custom_price: parseFloat(customPrice),
          })
          .eq("user_id", userId);
        
        if (updateError) throw new Error(`Error updating local subscription: ${updateError.message}`);
        logStep("Created new Stripe subscription with custom price", { 
          subscriptionId: subscription.id,
          priceId: customStripePrice.id,
          customPrice
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
