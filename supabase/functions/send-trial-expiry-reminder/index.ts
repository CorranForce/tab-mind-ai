import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIAL-EXPIRY-REMINDER] ${step}${detailsStr}`);
};

// Verify HMAC signature for secure webhook calls
const verifySignature = async (payload: string, signature: string, secret: string): Promise<boolean> => {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const dataBuffer = encoder.encode(payload);
    return await crypto.subtle.verify("HMAC", key, signatureBuffer, dataBuffer);
  } catch {
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Authentication check - require either admin auth or cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET_TOKEN");
    const signatureHeader = req.headers.get("X-Signature");
    
    let isAuthenticated = false;
    let isAdmin = false;

    // Check for admin authentication
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      
      // Check if it's the cron secret token
      if (cronSecret && token === cronSecret) {
        isAuthenticated = true;
        logStep("Authenticated via cron secret token");
      } else {
        // Check for admin user via JWT
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (!authError && user) {
          // Check admin role
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
          );

          const { data: roleData } = await serviceClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (roleData) {
            isAuthenticated = true;
            isAdmin = true;
            logStep("Authenticated as admin user", { userId: user.id });
          }
        }
      }
    }

    // Check for HMAC signature authentication (for webhooks)
    if (!isAuthenticated && signatureHeader && cronSecret) {
      const body = await req.clone().text();
      if (await verifySignature(body, signatureHeader, cronSecret)) {
        isAuthenticated = true;
        logStep("Authenticated via HMAC signature");
      }
    }

    if (!isAuthenticated) {
      logStep("Authentication failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON is fine for cron jobs
    }

    // Test mode only allowed for authenticated admins
    if (body.testEmail) {
      if (!isAdmin) {
        logStep("Test mode requires admin authentication");
        return new Response(JSON.stringify({ error: "Admin authentication required for test mode" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate test email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.testEmail) || body.testEmail.length > 255) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Test mode - sending to", { email: body.testEmail });
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "SmartTab AI <onboarding@resend.dev>",
          to: [body.testEmail],
          subject: "⏰ [TEST] Your SmartTab AI Trial Expires in 24 Hours",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                  .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
                  .warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  .footer { text-align: center; font-size: 14px; color: #6b7280; }
                  .test-banner { background: #ef4444; color: white; padding: 8px; text-align: center; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="test-banner">🧪 TEST EMAIL - This is a test</div>
                <div class="container">
                  <div class="header">
                    <div class="logo">🧠 SmartTab AI</div>
                  </div>
                  <div class="content">
                    <h1 style="margin-top: 0;">Your Trial is Ending Soon!</h1>
                    <div class="warning">
                      <p style="margin: 0; font-size: 20px; font-weight: bold;">⏰ ~24 hours remaining</p>
                    </div>
                    <p>Your SmartTab AI trial will expire soon. Don't lose access to:</p>
                    <ul>
                      <li>✨ AI-powered tab recommendations</li>
                      <li>📊 Personalized browsing insights</li>
                      <li>🗂️ Smart tab organization</li>
                      <li>⏱️ Time-saving automation</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://wjmkijvckvnrrsjzgwge.lovableproject.com/pricing" class="cta-button">
                        Upgrade to Pro Now →
                      </a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} SmartTab AI. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logStep("Failed to send test email", { error: errorData });
        return new Response(JSON.stringify({ error: "Failed to send test email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      logStep("Test email sent successfully");
      return new Response(JSON.stringify({ success: true, message: "Test email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get trials expiring in the next 24-25 hours that haven't been notified
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    logStep("Checking for expiring trials", { 
      from: in24Hours.toISOString(), 
      to: in25Hours.toISOString() 
    });

    const { data: expiringTrials, error: fetchError } = await supabaseClient
      .from("subscriptions")
      .select("id, user_id, trial_ends_at")
      .eq("status", "cancelled")
      .eq("trial_reminder_sent", false)
      .gte("trial_ends_at", in24Hours.toISOString())
      .lte("trial_ends_at", in25Hours.toISOString());

    if (fetchError) {
      logStep("Failed to fetch expiring trials", { error: fetchError.message });
      return new Response(JSON.stringify({ error: "Failed to fetch expiring trials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found expiring trials", { count: expiringTrials?.length || 0 });

    if (!expiringTrials || expiringTrials.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No trials expiring soon",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let sentCount = 0;

    for (const trial of expiringTrials) {
      try {
        // Get user email from auth
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(trial.user_id);
        
        if (userError || !userData?.user?.email) {
          logStep("Could not get user email", { userId: trial.user_id });
          continue;
        }

        const userEmail = userData.user.email;
        const trialEndsAt = new Date(trial.trial_ends_at);
        const hoursRemaining = Math.round((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

        logStep("Sending reminder to user", { email: userEmail, hoursRemaining });

        // Send email via Resend
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SmartTab AI <onboarding@resend.dev>",
            to: [userEmail],
            subject: "⏰ Your SmartTab AI Trial Expires in 24 Hours",
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { font-size: 24px; font-weight: bold; color: #6366f1; }
                    .content { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
                    .warning { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                    .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                    .footer { text-align: center; font-size: 14px; color: #6b7280; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div class="logo">🧠 SmartTab AI</div>
                    </div>
                    <div class="content">
                      <h1 style="margin-top: 0;">Your Trial is Ending Soon!</h1>
                      <div class="warning">
                        <p style="margin: 0; font-size: 20px; font-weight: bold;">⏰ ~${hoursRemaining} hours remaining</p>
                      </div>
                      <p>Your SmartTab AI trial will expire soon. Don't lose access to:</p>
                      <ul>
                        <li>✨ AI-powered tab recommendations</li>
                        <li>📊 Personalized browsing insights</li>
                        <li>🗂️ Smart tab organization</li>
                        <li>⏱️ Time-saving automation</li>
                      </ul>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://wjmkijvckvnrrsjzgwge.lovableproject.com/pricing" class="cta-button">
                          Upgrade to Pro Now →
                        </a>
                      </div>
                      <p style="color: #6b7280; font-size: 14px;">
                        If you've already upgraded, you can ignore this email.
                      </p>
                    </div>
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} SmartTab AI. All rights reserved.</p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          logStep("Failed to send email", { email: userEmail });
          continue;
        }

        // Mark as sent
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ trial_reminder_sent: true })
          .eq("id", trial.id);

        if (updateError) {
          logStep("Failed to mark reminder as sent", { id: trial.id });
        } else {
          sentCount++;
          logStep("Reminder sent successfully", { email: userEmail });
        }

      } catch (innerError: any) {
        logStep("Error processing trial", { id: trial.id });
      }
    }

    logStep("Completed", { totalTrials: expiringTrials.length, sentCount });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sent ${sentCount} reminder emails`,
      sent: sentCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
