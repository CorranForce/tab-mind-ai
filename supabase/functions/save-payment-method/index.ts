import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-PAYMENT-METHOD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) throw new Error("Payment method ID is required");
    logStep("Payment method ID received", { paymentMethodId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    logStep("Payment method retrieved from Stripe", {
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
    });

    if (!paymentMethod.card) {
      throw new Error("Invalid payment method - no card details found");
    }

    // Check if this is the first payment method for the user
    const { data: existingMethods, error: fetchError } = await supabaseClient
      .from("payment_methods")
      .select("id")
      .eq("user_id", user.id);

    if (fetchError) throw new Error(`Failed to fetch existing payment methods: ${fetchError.message}`);

    const isFirst = !existingMethods || existingMethods.length === 0;
    logStep("Checking existing methods", { isFirst });

    // Save payment method to database
    const { error: insertError } = await supabaseClient.from("payment_methods").insert({
      user_id: user.id,
      stripe_payment_method_id: paymentMethodId,
      card_brand: paymentMethod.card.brand,
      card_last4: paymentMethod.card.last4,
      card_exp_month: paymentMethod.card.exp_month,
      card_exp_year: paymentMethod.card.exp_year,
      is_default: isFirst,
    });

    if (insertError) throw new Error(`Failed to save payment method: ${insertError.message}`);
    logStep("Payment method saved to database");

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
