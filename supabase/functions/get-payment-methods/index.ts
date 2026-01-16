import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 30 requests per minute per user
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60; // seconds

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PAYMENT-METHODS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logStep("Authentication failed", { error: authError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("User authenticated", { userId: user.id });

    // Check rate limit using service role client
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc("check_rate_limit", {
        p_identifier: user.id,
        p_endpoint: "get-payment-methods",
        p_max_requests: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW,
      });

    if (rateLimitError) {
      logStep("Rate limit check failed", { error: rateLimitError.message });
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      logStep("Rate limit exceeded", rateLimitResult);
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
          retry_after: rateLimitResult.retry_after,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retry_after),
          },
        }
      );
    }

    // Get Stripe payment method IDs from database
    const { data: paymentMethodRecords, error: dbError } = await supabaseClient
      .from("payment_methods")
      .select("id, stripe_payment_method_id, is_default, created_at")
      .order("created_at", { ascending: false });

    if (dbError) {
      logStep("Database error", { error: dbError.message });
      return new Response(JSON.stringify({ error: "Failed to fetch payment methods" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentMethodRecords || paymentMethodRecords.length === 0) {
      logStep("No payment methods found");
      return new Response(JSON.stringify({ paymentMethods: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      logStep("Stripe secret key not configured");
      return new Response(JSON.stringify({ error: "Payment service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Fetch card details from Stripe for each payment method
    const paymentMethods = [];
    for (const record of paymentMethodRecords) {
      if (!record.stripe_payment_method_id) continue;

      try {
        const stripePaymentMethod = await stripe.paymentMethods.retrieve(
          record.stripe_payment_method_id
        );

        if (stripePaymentMethod.card) {
          paymentMethods.push({
            id: record.id,
            card_brand: stripePaymentMethod.card.brand,
            card_last4: stripePaymentMethod.card.last4,
            card_exp_month: stripePaymentMethod.card.exp_month,
            card_exp_year: stripePaymentMethod.card.exp_year,
            is_default: record.is_default,
          });
        }
      } catch (stripeError: any) {
        logStep("Failed to retrieve payment method from Stripe", { 
          id: record.id, 
          error: stripeError.message 
        });
        // Skip this payment method if we can't retrieve it from Stripe
      }
    }

    logStep("Payment methods retrieved", { count: paymentMethods.length });

    return new Response(JSON.stringify({ paymentMethods }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});