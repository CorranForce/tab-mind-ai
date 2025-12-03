import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-UPGRADE-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    // Get user profile for personalization
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || user.email.split("@")[0];
    logStep("Got user profile", { userName });

    // Update subscription status from trial to active
    const { error: updateError } = await supabaseClient
      .from("subscriptions")
      .update({ 
        status: "active",
        trial_ends_at: null 
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating subscription", { error: updateError.message });
    } else {
      logStep("Subscription updated to active");
    }

    // Send upgrade confirmation email via Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .logo { font-size: 32px; font-weight: bold; color: #7c3aed; }
          .content { background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 32px; }
          .feature-list { list-style: none; padding: 0; margin: 24px 0; }
          .feature-list li { padding: 8px 0; padding-left: 28px; position: relative; }
          .feature-list li:before { content: "✓"; position: absolute; left: 0; color: #22c55e; font-weight: bold; }
          .cta-button { display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
          .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SmartTab AI</div>
          </div>
          
          <h1 style="text-align: center; margin-bottom: 24px;">Welcome to Pro, ${userName}! 🚀</h1>
          
          <div class="content">
            <p>Thank you for upgrading to SmartTab AI Pro! Your subscription is now active and you have full access to all premium features.</p>
            
            <h3>Here's what you now have access to:</h3>
            <ul class="feature-list">
              <li>AI-powered tab recommendations</li>
              <li>Advanced analytics dashboard</li>
              <li>Cross-device sync</li>
              <li>Priority support</li>
              <li>Custom tab organization rules</li>
            </ul>
            
            <p>Your trial has ended and your paid subscription is now active. You can manage your subscription anytime from your dashboard.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${req.headers.get("origin") || "https://smarttab.ai"}/dashboard" class="cta-button">Go to Dashboard</a>
          </div>
          
          <div class="footer">
            <p>If you have any questions, just reply to this email - we're here to help!</p>
            <p>© ${new Date().getFullYear()} SmartTab AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SmartTab AI <onboarding@resend.dev>",
        to: [user.email],
        subject: "Welcome to SmartTab AI Pro! 🎉",
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      logStep("Email send failed", { error: emailResult });
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    logStep("Email sent successfully", { emailId: emailResult.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
