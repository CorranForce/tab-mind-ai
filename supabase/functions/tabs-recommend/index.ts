import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's tab activity from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tabActivity, error: fetchError } = await supabaseClient
      .from("tab_activity")
      .select("*")
      .eq("user_id", user.id)
      .gte("last_visited_at", thirtyDaysAgo.toISOString())
      .order("last_visited_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    // Calculate relevance scores for recommendations
    const now = Date.now();
    const recommendations = (tabActivity || [])
      .filter(tab => !tab.is_archived)
      .map(tab => {
        // Recency score (0-0.4) - higher for more recent
        const lastVisit = new Date(tab.last_visited_at).getTime();
        const hoursSinceVisit = (now - lastVisit) / (1000 * 60 * 60);
        const recencyScore = Math.max(0, 0.4 * (1 - hoursSinceVisit / 168)); // 168 hours = 1 week

        // Frequency score (0-0.3) - higher for more visits
        const frequencyScore = Math.min(0.3, (tab.visit_count || 1) * 0.03);

        // Domain diversity bonus (0-0.2)
        const domainBonus = 0.1; // Simplified for now

        // Time of day relevance (0-0.1)
        const timeBonus = 0.05; // Simplified for now

        const totalScore = recencyScore + frequencyScore + domainBonus + timeBonus;

        return {
          ...tab,
          score: Math.min(1, totalScore),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Get archived tabs
    const { data: archivedTabs } = await supabaseClient
      .from("tab_activity")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", true)
      .order("archived_at", { ascending: false })
      .limit(20);

    return new Response(
      JSON.stringify({
        recommendations,
        archived: archivedTabs || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error getting recommendations:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
