import { Link } from "react-router-dom";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">SmartTab AI</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: March 1, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By installing, accessing, or using the SmartTab AI Chrome extension or web application (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              SmartTab AI is an AI-powered browser tab management tool that tracks your tab usage patterns, provides intelligent recommendations, and automatically archives unused tabs. The Service consists of a Chrome browser extension and a companion web application for account management, analytics, and settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, you must create an account with a valid email address. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and up-to-date information</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Subscription Plans & Billing</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">4.1 Free Trial</h3>
            <p className="text-muted-foreground leading-relaxed">
              New users receive a 14-day free trial. No credit card is required to start a trial. At the end of the trial, you must subscribe to a paid plan to continue using premium features.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">4.2 Paid Plans</h3>
            <p className="text-muted-foreground leading-relaxed">
              Paid subscriptions are billed monthly or annually via Stripe. Prices are displayed on our pricing page and may be updated with 30 days' notice. All fees are non-refundable except as required by applicable law.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">4.3 Cancellation</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time. Access to paid features continues until the end of the current billing period. No partial refunds are issued for unused time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse-engineer, decompile, or disassemble the Service</li>
              <li>Circumvent any access controls or usage limits</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use automated means to access the Service beyond normal extension operation</li>
              <li>Share, resell, or sublicense your account access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its code, design, algorithms, and branding, is owned by SmartTab AI and protected by intellectual property laws. You retain ownership of your personal data. By using the Service, you grant us a limited license to process your tab data solely to provide the Service's features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. API Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              API access is available on eligible plans. API keys are personal and non-transferable. We reserve the right to rate-limit or revoke API access for abuse. You are responsible for all activity performed using your API keys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive for high availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable for maintenance, updates, or circumstances beyond our control. We are not liable for any loss resulting from downtime.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, SmartTab AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or profits, arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. You may request export of your data within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. Material changes will be communicated via email or through the Service at least 30 days before taking effect. Continued use of the Service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please visit our{" "}
              <Link to="/support" className="text-primary underline hover:opacity-80">
                Support page
              </Link>{" "}
              to submit a request.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">SmartTab AI</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 SmartTab AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
};

export default TermsOfService;
