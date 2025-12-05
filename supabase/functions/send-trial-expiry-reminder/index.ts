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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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
      throw new Error(`Failed to fetch expiring trials: ${fetchError.message}`);
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
          logStep("Could not get user email", { userId: trial.user_id, error: userError?.message });
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
          logStep("Failed to send email", { email: userEmail, error: errorData });
          continue;
        }

        // Mark as sent
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ trial_reminder_sent: true })
          .eq("id", trial.id);

        if (updateError) {
          logStep("Failed to mark reminder as sent", { id: trial.id, error: updateError.message });
        } else {
          sentCount++;
          logStep("Reminder sent successfully", { email: userEmail });
        }

      } catch (innerError: any) {
        logStep("Error processing trial", { id: trial.id, error: innerError.message });
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
