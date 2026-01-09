import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-PAYMENT-ANALYTICS] ${step}${detailsStr}`);
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
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw new Error(`Role check error: ${roleError.message}`);
    if (!roleData) throw new Error("Unauthorized: Admin access required");
    logStep("Admin role verified");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe key not configured");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get charges from the last 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const charges = await stripe.charges.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    logStep("Charges fetched", { count: charges.data.length });

    // Group charges by date and status
    const dailyStats: Record<string, { succeeded: number; failed: number; date: string }> = {};

    for (const charge of charges.data) {
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = { succeeded: 0, failed: 0, date };
      }

      if (charge.status === 'succeeded') {
        dailyStats[date].succeeded++;
      } else if (charge.status === 'failed') {
        dailyStats[date].failed++;
      }
    }

    // Convert to array and sort by date
    const chartData = Object.values(dailyStats).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals
    let succeededCount = 0;
    let failedCount = 0;
    for (const charge of charges.data) {
      if (charge.status === 'succeeded') succeededCount++;
      else if (charge.status === 'failed') failedCount++;
    }
    const totals = { succeeded: succeededCount, failed: failedCount };

    const successRate = totals.succeeded + totals.failed > 0
      ? Math.round((totals.succeeded / (totals.succeeded + totals.failed)) * 100)
      : 100;

    logStep("Analytics calculated", { totals, successRate });

    return new Response(JSON.stringify({ 
      chartData,
      totals,
      successRate,
    }), {
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
