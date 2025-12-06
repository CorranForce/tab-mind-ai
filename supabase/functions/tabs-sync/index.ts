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

    const { tabs } = await req.json();
    if (!tabs || !Array.isArray(tabs)) {
      return new Response(JSON.stringify({ error: "Invalid tabs data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert tab activity data
    for (const tab of tabs) {
      if (!tab.url) continue;

      const { error } = await supabaseClient
        .from("tab_activity")
        .upsert({
          user_id: user.id,
          url: tab.url.substring(0, 2048), // Limit URL length
          title: (tab.title || "Untitled").substring(0, 500),
          favicon_url: tab.favIconUrl?.substring(0, 500) || null,
          visit_count: tab.visits || 1,
          last_visited_at: new Date().toISOString(),
          domain: new URL(tab.url).hostname,
        }, {
          onConflict: "user_id,url",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("Error upserting tab:", error);
      }
    }

    return new Response(JSON.stringify({ success: true, synced: tabs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error syncing tabs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
