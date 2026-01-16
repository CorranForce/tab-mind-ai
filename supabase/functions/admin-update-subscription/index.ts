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
    if (!authHeader) {
      logStep("No authorization header provided");
      throw new Error("UNAUTHORIZED");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      throw new Error("UNAUTHORIZED");
    }
    const adminUser = userData.user;
    if (!adminUser) {
      logStep("User not authenticated");
      throw new Error("UNAUTHORIZED");
    }
    logStep("User authenticated", { userId: adminUser.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      logStep("Role check error", { error: roleError.message });
      throw new Error("FORBIDDEN");
    }
    if (!roleData) {
      logStep("User is not admin");
      throw new Error("FORBIDDEN");
    }
    logStep("Admin role verified");

    // Parse request body
    const { userId, action, billingDate, customPrice } = await req.json();
    if (!userId) {
      logStep("userId is required");
      throw new Error("BAD_REQUEST");
    }
    
    const validActions = ["grant_pro", "revoke_pro", "update_billing_date", "update_custom_price", "clear_custom_price"];
    if (!action || !validActions.includes(action)) {
      logStep("Invalid action", { action, validActions });
      throw new Error("BAD_REQUEST");
    }
    logStep("Request parsed", { userId, action, billingDate, customPrice });

    // Get user's email for Stripe operations
    const { data: targetUser, error: targetUserError } = await supabaseClient.auth.admin.getUserById(userId);
    if (targetUserError) {
      logStep("Error fetching target user", { error: targetUserError.message });
      throw new Error("USER_NOT_FOUND");
    }
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

      if (updateError) {
        logStep("Update error", { error: updateError.message });
        throw new Error("UPDATE_FAILED");
      }
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

      if (updateError) {
        logStep("Update error", { error: updateError.message });
        throw new Error("UPDATE_FAILED");
      }
      logStep("Pro access revoked", { userId });
      
    } else if (action === "update_billing_date") {
      if (!billingDate) {
        logStep("billingDate is required for update_billing_date action");
        throw new Error("BAD_REQUEST");
      }
      
      // Parse and validate the date
      const newBillingDate = new Date(billingDate);
      if (isNaN(newBillingDate.getTime())) {
        logStep("Invalid billingDate format", { billingDate });
        throw new Error("BAD_REQUEST");
      }
      
      // Update the billing/subscription end date
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          current_period_end: newBillingDate.toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Update error", { error: updateError.message });
        throw new Error("UPDATE_FAILED");
      }
      logStep("Billing date updated", { userId, newBillingDate: newBillingDate.toISOString() });
      
    } else if (action === "update_custom_price") {
      if (!customPrice) {
        logStep("customPrice is required for update_custom_price action");
        throw new Error("BAD_REQUEST");
      }
      if (!userEmail) {
        logStep("User email not found");
        throw new Error("USER_NOT_FOUND");
      }
      
      const priceInCents = Math.round(parseFloat(customPrice) * 100);
      if (isNaN(priceInCents) || priceInCents <= 0) {
        logStep("Invalid custom price", { customPrice });
        throw new Error("BAD_REQUEST");
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
      
      if (subError) {
        logStep("Error fetching subscription", { error: subError.message });
        throw new Error("QUERY_FAILED");
      }

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
        // No existing Stripe subscription - just save the custom price to the database
        // Don't try to create a Stripe subscription as the user may not have a payment method
        // The custom price will be applied when/if they subscribe through normal checkout
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ 
            custom_price: parseFloat(customPrice),
            status: "active",
          })
          .eq("user_id", userId);
        
        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
          throw new Error("UPDATE_FAILED");
        }
        logStep("Saved custom price to database (no Stripe subscription)", { 
          customPrice,
          stripePrice: customStripePrice.id 
        });
      }
    } else if (action === "clear_custom_price") {
      if (!userEmail) {
        logStep("User email not found");
        throw new Error("USER_NOT_FOUND");
      }
      
      // Get user's current subscription from database
      const { data: subData, error: subError } = await supabaseClient
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (subError) {
        logStep("Error fetching subscription", { error: subError.message });
        throw new Error("QUERY_FAILED");
      }

      if (subData?.stripe_subscription_id) {
        // Get the default product price from Stripe
        const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
        const currentInterval = subscription.items.data[0]?.price?.recurring?.interval || "month";
        
        // Fetch the default price for the Pro product (prod_TVVAI2BQPBNmIf)
        const prices = await stripe.prices.list({
          product: "prod_TVVAI2BQPBNmIf",
          active: true,
          recurring: { interval: currentInterval },
          limit: 10,
        });
        
        // Find the standard price (one without "Custom" in nickname)
        const standardPrice = prices.data.find((p: Stripe.Price) => !p.nickname?.includes("Custom"));
        
        if (standardPrice) {
          const subscriptionItemId = subscription.items.data[0]?.id;
          
          if (subscriptionItemId) {
            await stripe.subscriptions.update(subData.stripe_subscription_id, {
              items: [{
                id: subscriptionItemId,
                price: standardPrice.id,
              }],
              proration_behavior: "none",
            });
            logStep("Reverted Stripe subscription to standard price", { 
              subscriptionId: subData.stripe_subscription_id,
              standardPriceId: standardPrice.id 
            });
          }
        } else {
          logStep("No standard price found, only clearing database custom_price");
        }
      }
      
      // Clear custom price from database
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({ custom_price: null })
        .eq("user_id", userId);
      
      if (updateError) {
        logStep("Error clearing custom price", { error: updateError.message });
        throw new Error("UPDATE_FAILED");
      }
      logStep("Custom price cleared from database", { userId });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Map internal errors to generic client messages
    const errorMap: Record<string, { status: number; message: string }> = {
      "UNAUTHORIZED": { status: 401, message: "Unauthorized" },
      "FORBIDDEN": { status: 403, message: "Admin access required" },
      "BAD_REQUEST": { status: 400, message: "Invalid request" },
      "USER_NOT_FOUND": { status: 404, message: "User not found" },
      "QUERY_FAILED": { status: 500, message: "Operation failed" },
      "UPDATE_FAILED": { status: 500, message: "Update failed" },
    };
    
    const mapped = errorMap[errorMessage] || { status: 500, message: "An error occurred" };
    
    return new Response(JSON.stringify({ error: mapped.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: mapped.status,
    });
  }
});
