import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const { userId, action } = await req.json();
    if (!userId) throw new Error("userId is required");
    if (!action || !["grant_pro", "revoke_pro"].includes(action)) {
      throw new Error("Invalid action. Must be 'grant_pro' or 'revoke_pro'");
    }
    logStep("Request parsed", { userId, action });

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
