import { Link } from "react-router-dom";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const PrivacyPolicy = () => {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: March 1, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              SmartTab AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our Chrome extension and web application (collectively, the "Service").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Account Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account, we collect your email address and optional display name. This information is used for authentication and account management.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Tab Activity Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our Chrome extension collects information about your browser tabs, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Tab URLs and page titles</li>
              <li>Domain names</li>
              <li>Favicon URLs</li>
              <li>Visit timestamps and frequency</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              This data is used exclusively to provide tab organization, recommendations, and archiving features. We do <strong>not</strong> collect page content, form data, passwords, or any information entered on web pages.
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.3 Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect anonymized usage analytics to improve the Service, such as feature usage patterns and error logs. This data cannot be used to identify individual users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide AI-powered tab recommendations and organization</li>
              <li>To sync your tab data across devices</li>
              <li>To auto-archive inactive tabs based on your preferences</li>
              <li>To authenticate your account and manage your subscription</li>
              <li>To improve and develop new features</li>
              <li>To send service-related communications (e.g., trial expiry reminders)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption. We use row-level security policies to ensure that users can only access their own data. All data transmission between the extension and our servers uses HTTPS encryption.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong>not</strong> sell, trade, or share your personal data with third parties, except:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>With payment processors (Stripe) to handle subscription billing — only billing-related data is shared</li>
              <li>When required by law or to protect our legal rights</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Chrome Extension Permissions</h2>
            <p className="text-muted-foreground leading-relaxed">Our extension requests the following permissions:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li><strong>tabs</strong> — To read tab URLs and titles for organization and recommendations</li>
              <li><strong>storage</strong> — To store your authentication session and local preferences</li>
              <li><strong>activeTab</strong> — To detect your currently active tab for context-aware suggestions</li>
              <li><strong>sidePanel</strong> — To display the SmartTab AI sidebar interface</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Tab activity data is retained for as long as your account is active. Archived tab records may be automatically purged after 90 days of inactivity. You can request deletion of your data at any time by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data and account</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time by uninstalling the extension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or your data, please visit our{" "}
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

export default PrivacyPolicy;
