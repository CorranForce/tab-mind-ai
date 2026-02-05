import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
    const user = userData.user;
    if (!user?.email) {
      logStep("User not authenticated or email not available");
      throw new Error("UNAUTHORIZED");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First check database for manually granted subscriptions (admin-granted pro access)
    const { data: dbSubscription, error: dbError } = await supabaseClient
      .from("subscriptions")
      .select("status, current_period_end, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError) {
      logStep("Database subscription check error", { error: dbError.message });
    }

    // If user has active status in DB without a Stripe subscription ID, it's admin-granted
    if (dbSubscription?.status === "active" && !dbSubscription.stripe_subscription_id) {
      logStep("Admin-granted subscription found", { 
        status: dbSubscription.status, 
        currentPeriodEnd: dbSubscription.current_period_end 
      });
      
      // For admin-granted subs, use a special product ID to indicate pro access
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: "prod_TvKapBPJXyIQDa", // Pro product ID
        subscription_end: dbSubscription.current_period_end
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Otherwise, check Stripe for paid subscriptions
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
      logStep("Active Stripe subscription found", { subscriptionId: subscription.id, productId });
    } else {
      logStep("No active Stripe subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Map internal errors to generic client messages
    const statusCode = errorMessage === "UNAUTHORIZED" ? 401 : 500;
    const clientMessage = errorMessage === "UNAUTHORIZED" ? "Unauthorized" : "An error occurred";
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
