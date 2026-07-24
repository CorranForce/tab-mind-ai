import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 60 requests per minute per user
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW = 60; // seconds

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

    // Check rate limit using service role client
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: rateLimitResult, error: rateLimitError } = await serviceClient
      .rpc("check_rate_limit", {
        p_identifier: user.id,
        p_endpoint: "tabs-sync",
        p_max_requests: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW,
      });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
      // Continue without rate limiting if check fails
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
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

    const body = await req.json();
    const { tabs } = body;
    
    // Validate tabs array exists and has reasonable size
    if (!tabs || !Array.isArray(tabs)) {
      return new Response(JSON.stringify({ error: "Invalid tabs data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Enforce maximum tab count per sync request
    const MAX_TABS_PER_SYNC = 100;
    if (tabs.length > MAX_TABS_PER_SYNC) {
      return new Response(
        JSON.stringify({ error: `Too many tabs: maximum ${MAX_TABS_PER_SYNC} per sync` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert tab activity data
    let syncedCount = 0;
    for (const tab of tabs) {
      if (!tab.url || typeof tab.url !== 'string') continue;

      // Validate URL scheme - only allow http and https
      const urlLower = tab.url.toLowerCase();
      if (!urlLower.startsWith('http://') && !urlLower.startsWith('https://')) {
        console.error("Invalid URL scheme, skipping tab");
        continue;
      }

      // Safely parse URL to extract domain
      let domain: string | null = null;
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(tab.url);
        domain = parsedUrl.hostname;
        
        // Additional validation: hostname must exist
        if (!domain || domain.length === 0) {
          console.error("Empty hostname, skipping tab");
          continue;
        }
      } catch (e) {
        console.error("Invalid URL format, skipping tab");
        continue; // Skip this tab, process others
      }

      const { error } = await supabaseClient
        .from("tab_activity")
        .upsert({
          user_id: user.id,
          url: tab.url.substring(0, 2048), // Limit URL length
          title: (tab.title || "Untitled").substring(0, 500),
          favicon_url: tab.favIconUrl?.substring(0, 500) || null,
          visit_count: tab.visits || 1,
          last_visited_at: new Date().toISOString(),
          domain: domain,
        }, {
          onConflict: "user_id,url",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("Error upserting tab:", error);
      } else {
        syncedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, synced: syncedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error syncing tabs:", error);
    // Log detailed error server-side, return generic message to client
    return new Response(JSON.stringify({ error: "Failed to sync tabs" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});