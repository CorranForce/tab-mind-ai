import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-LIST-SUBSCRIPTIONS] ${step}${detailsStr}`);
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

    // Get all users with their subscriptions and profiles
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("user_id, status, trial_ends_at, current_period_end");

    if (subError) throw new Error(`Subscriptions query error: ${subError.message}`);
    logStep("Subscriptions loaded", { count: subscriptions?.length });

    // Get user emails from auth.users via admin API
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    if (authError) throw new Error(`Auth users query error: ${authError.message}`);

    // Get profiles for full names
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, full_name");

    if (profileError) throw new Error(`Profiles query error: ${profileError.message}`);

    // Map subscriptions with user data
    const usersWithSubs = subscriptions?.map((sub) => {
      const authUser = authUsers.users.find((u) => u.id === sub.user_id);
      const profile = profiles?.find((p) => p.id === sub.user_id);

      return {
        user_id: sub.user_id,
        email: authUser?.email || "Unknown",
        full_name: profile?.full_name || null,
        status: sub.status,
        trial_ends_at: sub.trial_ends_at,
        current_period_end: sub.current_period_end,
      };
    }) || [];

    logStep("Users mapped", { count: usersWithSubs.length });

    return new Response(JSON.stringify({ users: usersWithSubs }), {
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
