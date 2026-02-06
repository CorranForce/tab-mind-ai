import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[API-AUTHENTICATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role to bypass RLS for inserting usage logs
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Extract API key from header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      logStep("No API key provided");
      return new Response(
        JSON.stringify({ error: "Missing x-api-key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract request metadata
    const { endpoint, method } = await req.json().catch(() => ({
      endpoint: "/unknown",
      method: "GET",
    }));

    logStep("Authenticating API key", { prefix: apiKey.substring(0, 12) });

    // Hash the provided key to compare against stored hashes
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Look up the key
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("id, user_id, is_active, name")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (keyError) {
      logStep("Database error looking up key", { error: keyError.message });
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!keyData) {
      logStep("Invalid or revoked API key");
      return new Response(
        JSON.stringify({ error: "Invalid or revoked API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("API key validated", { keyId: keyData.id, userId: keyData.user_id, keyName: keyData.name });

    // Rate limiting: 100 requests per 60 seconds per API key
    const { data: rateLimitResult, error: rateLimitError } = await supabaseAdmin
      .rpc("check_rate_limit", {
        p_identifier: keyData.id,
        p_endpoint: "api-authenticate",
        p_max_requests: 100,
        p_window_seconds: 60,
      });

    if (rateLimitError) {
      logStep("Rate limit check failed", { error: rateLimitError.message });
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { keyId: keyData.id, count: rateLimitResult.current_count });
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
    } else {
      logStep("Rate limit check passed", { remaining: rateLimitResult?.remaining });
    }

    const startTime = Date.now();

    // Update last_used_at on the key
    await supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyData.id);

    const responseTimeMs = Date.now() - startTime;

    // Log usage
    const { error: usageError } = await supabaseAdmin
      .from("api_usage")
      .insert({
        api_key_id: keyData.id,
        user_id: keyData.user_id,
        endpoint: endpoint || "/unknown",
        method: method || "GET",
        status_code: 200,
        response_time_ms: responseTimeMs,
      });

    if (usageError) {
      logStep("Failed to log usage", { error: usageError.message });
      // Don't fail the request if logging fails
    } else {
      logStep("Usage logged successfully");
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user_id: keyData.user_id,
        key_id: keyData.id,
        key_name: keyData.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
