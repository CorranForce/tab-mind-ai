import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    if (!user) {
      logStep("User not authenticated");
      throw new Error("UNAUTHORIZED");
    }
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
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

    // Get all users with their subscriptions and profiles
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("user_id, status, trial_ends_at, current_period_end, current_period_start, created_at, stripe_subscription_id, custom_price");

    if (subError) {
      logStep("Subscriptions query error", { error: subError.message });
      throw new Error("QUERY_FAILED");
    }
    logStep("Subscriptions loaded", { count: subscriptions?.length });

    // Get user emails and last sign in from auth.users via admin API
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    if (authError) {
      logStep("Auth users query error", { error: authError.message });
      throw new Error("QUERY_FAILED");
    }

    // Get profiles for full names
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, full_name, updated_at");

    if (profileError) {
      logStep("Profiles query error", { error: profileError.message });
      throw new Error("QUERY_FAILED");
    }

    // Get admin roles
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");

    if (rolesError) {
      logStep("Roles query error (non-fatal)", { error: rolesError.message });
    }

    // Get latest tab activity per user to determine activity status
    const { data: tabActivity, error: tabError } = await supabaseClient
      .from("tab_activity")
      .select("user_id, last_visited_at")
      .order("last_visited_at", { ascending: false });

    if (tabError) {
      logStep("Tab activity query error (non-fatal)", { error: tabError.message });
    }

    // Initialize Stripe to fetch billing intervals
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripe: Stripe | null = null;
    if (stripeKey) {
      stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    }

    // Map subscriptions with user data - need to use Promise.all for async Stripe calls
    const usersWithSubs = await Promise.all((subscriptions || []).map(async (sub) => {
      const authUser = authUsers.users.find((u) => u.id === sub.user_id);
      const profile = profiles?.find((p) => p.id === sub.user_id);
      const isAdmin = adminRoles?.some((r) => r.user_id === sub.user_id) || false;
      
      // Find most recent activity for this user
      const userActivity = tabActivity?.find((t) => t.user_id === sub.user_id);
      
      // Determine activity status - active if activity in last 7 days or signed in recently
      const lastActivity = userActivity?.last_visited_at || authUser?.last_sign_in_at;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const isActive = lastActivity ? new Date(lastActivity) > sevenDaysAgo : false;

      // Fetch billing interval and payment status from Stripe if subscription exists
      let billingInterval: string | null = null;
      let paymentStatus: string | null = null;
      if (stripe && sub.stripe_subscription_id) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
            expand: ['latest_invoice']
          });
          billingInterval = stripeSub.items.data[0]?.price?.recurring?.interval || null;
          
          // Get payment status from latest invoice
          const latestInvoice = stripeSub.latest_invoice;
          if (latestInvoice && typeof latestInvoice === 'object') {
            const invoiceStatus = latestInvoice.status;
            if (invoiceStatus === 'paid') {
              paymentStatus = 'succeeded';
            } else if (invoiceStatus === 'open' || invoiceStatus === 'uncollectible') {
              paymentStatus = 'failed';
            } else if (invoiceStatus === 'draft' || invoiceStatus === 'void') {
              paymentStatus = 'pending';
            } else {
              paymentStatus = invoiceStatus;
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logStep("Error fetching Stripe subscription", { subscriptionId: sub.stripe_subscription_id, error: errorMsg });
        }
      }

      return {
        user_id: sub.user_id,
        email: authUser?.email || "Unknown",
        full_name: profile?.full_name || null,
        status: sub.status,
        trial_ends_at: sub.trial_ends_at,
        current_period_end: sub.current_period_end,
        current_period_start: sub.current_period_start,
        created_at: authUser?.created_at || sub.created_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        last_activity: lastActivity || null,
        is_active: isActive,
        stripe_subscription_id: sub.stripe_subscription_id || null,
        is_admin: isAdmin,
        custom_price: sub.custom_price || null,
        billing_interval: billingInterval,
        payment_status: paymentStatus,
      };
    }));

    // Sort by last activity (most recent first)
    usersWithSubs.sort((a, b) => {
      if (!a.last_activity && !b.last_activity) return 0;
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });

    logStep("Users mapped", { count: usersWithSubs.length });

    return new Response(JSON.stringify({ users: usersWithSubs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Map internal errors to generic client messages
    const statusCode = errorMessage === "UNAUTHORIZED" ? 401 : 
                       errorMessage === "FORBIDDEN" ? 403 : 500;
    const clientMessage = errorMessage === "UNAUTHORIZED" ? "Unauthorized" :
                          errorMessage === "FORBIDDEN" ? "Admin access required" :
                          "An error occurred";
    
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
