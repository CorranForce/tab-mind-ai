import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WaitlistRequest {
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: WaitlistRequest = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    console.log("Sending waitlist confirmation to:", email);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SmartTab AI <onboarding@resend.dev>",
        to: [email],
        subject: "You're on the SmartTab AI Extension Waitlist! 🎉",
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
                .highlight { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                .footer { text-align: center; font-size: 14px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">🧠 SmartTab AI</div>
                </div>
                <div class="content">
                  <h1 style="margin-top: 0;">You're on the list!</h1>
                  <p>Thanks for joining the SmartTab AI browser extension waitlist. We're excited to have you!</p>
                  <div class="highlight">
                    <p style="margin: 0; font-size: 18px;">We'll notify you as soon as the extension is ready for download.</p>
                  </div>
                  <p>In the meantime, you can explore our web dashboard to see how SmartTab AI will help you:</p>
                  <ul>
                    <li>Automatically organize your browser tabs</li>
                    <li>Get AI-powered tab recommendations</li>
                    <li>Archive unused tabs without losing them</li>
                    <li>Save hours of manual tab management</li>
                  </ul>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} SmartTab AI. All rights reserved.</p>
                  <p>You're receiving this because you signed up for the extension waitlist.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending waitlist confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
