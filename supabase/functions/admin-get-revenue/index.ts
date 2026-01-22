import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-GET-REVENUE] ${step}${detailsStr}`);
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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get balance
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) / 100;
    logStep("Balance retrieved", { available: availableBalance, pending: pendingBalance });

    // Get recent charges for monthly revenue calculation
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
      limit: 100,
    });

    const monthlyRevenue = charges.data
      .filter((c: { status: string; refunded: boolean }) => c.status === "succeeded" && !c.refunded)
      .reduce((sum: number, c: { amount: number }) => sum + c.amount, 0) / 100;
    logStep("Monthly revenue calculated", { monthlyRevenue });

    // Get active subscriptions count from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });
    const activeSubscriptions = subscriptions.data.length;
    logStep("Active subscriptions counted", { count: activeSubscriptions });

    // Calculate MRR from active subscriptions
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        if (item.price.recurring) {
          let amount = (item.price.unit_amount || 0) / 100;
          // Convert to monthly if annual
          if (item.price.recurring.interval === "year") {
            amount = amount / 12;
          } else if (item.price.recurring.interval === "week") {
            amount = amount * 4.33;
          } else if (item.price.recurring.interval === "day") {
            amount = amount * 30;
          }
          mrr += amount * (item.quantity || 1);
        }
      }
    }
    logStep("MRR calculated", { mrr });

    // Get recent successful payments count
    const recentPayments = charges.data.filter((c: { status: string }) => c.status === "succeeded").length;

    return new Response(JSON.stringify({
      availableBalance,
      pendingBalance,
      monthlyRevenue,
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptions,
      recentPayments,
      currency: balance.available[0]?.currency?.toUpperCase() || "USD",
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
    }
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
