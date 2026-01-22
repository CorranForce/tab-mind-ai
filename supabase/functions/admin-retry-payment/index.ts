import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-RETRY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");
    logStep("Request parsed", { userId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get the user's subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .single();

    if (subError) throw new Error(`Subscription fetch error: ${subError.message}`);
    if (!subscription?.stripe_subscription_id) {
      throw new Error("User does not have a Stripe subscription to retry");
    }
    logStep("Subscription found", { stripeSubId: subscription.stripe_subscription_id });

    // Get the Stripe subscription to find latest invoice
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    logStep("Stripe subscription retrieved", { status: stripeSubscription.status });

    // Find the latest unpaid invoice
    const invoices = await stripe.invoices.list({
      subscription: subscription.stripe_subscription_id,
      status: "open",
      limit: 1,
    });

    if (invoices.data.length === 0) {
      // No open invoices, check for draft invoices
      const draftInvoices = await stripe.invoices.list({
        subscription: subscription.stripe_subscription_id,
        status: "draft",
        limit: 1,
      });

      if (draftInvoices.data.length === 0) {
        throw new Error("No unpaid invoices found for this subscription");
      }

      // Finalize and pay the draft invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(draftInvoices.data[0].id);
      logStep("Draft invoice finalized", { invoiceId: finalizedInvoice.id });

      const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);
      logStep("Invoice payment attempted", { invoiceId: paidInvoice.id, status: paidInvoice.status });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment retried successfully",
        invoiceStatus: paidInvoice.status 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Retry payment on the open invoice
    const invoice = invoices.data[0];
    logStep("Open invoice found", { invoiceId: invoice.id });

    const paidInvoice = await stripe.invoices.pay(invoice.id);
    logStep("Invoice payment retried", { invoiceId: paidInvoice.id, status: paidInvoice.status });

    // Update subscription status if payment succeeded
    if (paidInvoice.status === "paid") {
      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Warning: Failed to update subscription status", { error: updateError.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: paidInvoice.status === "paid" ? "Payment successful" : "Payment attempted",
      invoiceStatus: paidInvoice.status 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Map specific errors to safe client messages
    let clientMessage = "An error occurred";
    let statusCode = 500;
    
    if (errorMessage.includes("No authorization header")) {
      clientMessage = "Authentication required";
      statusCode = 401;
    } else if (errorMessage.includes("User not authenticated") || errorMessage.includes("Authentication error")) {
      clientMessage = "Invalid authentication";
      statusCode = 401;
    } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("Admin access required")) {
      clientMessage = "Access denied";
      statusCode = 403;
    } else if (errorMessage.includes("userId is required")) {
      clientMessage = "User ID is required";
      statusCode = 400;
    } else if (errorMessage.includes("does not have a Stripe subscription")) {
      clientMessage = "No subscription found to retry";
      statusCode = 404;
    } else if (errorMessage.includes("No unpaid invoices")) {
      clientMessage = "No unpaid invoices found";
      statusCode = 404;
    }
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
