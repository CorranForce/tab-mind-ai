import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Check, ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Pricing = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out SmartTab AI",
      features: [
        "Up to 10 active tabs",
        "Basic AI recommendations",
        "7-day archive history",
        "Single device sync",
        "Community support",
      ],
      limitations: [
        "Limited tab management",
        "Basic analytics",
      ],
      cta: "Start Free",
      ctaLink: isAuthenticated ? "/dashboard" : "/auth",
      variant: "outline" as const,
      popular: false,
    },
    {
      name: "Pro",
      price: "$12",
      period: "per month",
      description: "For power users who need advanced features",
      features: [
        "Unlimited active tabs",
        "Advanced AI predictions",
        "Unlimited archive history",
        "Multi-device sync",
        "Priority support",
        "Custom tab groups",
        "Advanced analytics",
        "Context-aware suggestions",
      ],
      limitations: [],
      cta: "Start 14-Day Trial",
      ctaLink: isAuthenticated ? "/dashboard" : "/auth",
      variant: "default" as const,
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description: "For teams and organizations",
      features: [
        "Everything in Pro",
        "Team collaboration",
        "Advanced security",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
        "Custom training",
        "API access",
      ],
      limitations: [],
      cta: "Contact Sales",
      ctaLink: "#contact",
      variant: "outline" as const,
      popular: false,
    },
  ];

  const allFeatures = [
    {
      category: "Tab Management",
      features: [
        { name: "Active tabs limit", free: "10", pro: "Unlimited", enterprise: "Unlimited" },
        { name: "Archive history", free: "7 days", pro: "Unlimited", enterprise: "Unlimited" },
        { name: "Custom tab groups", free: "—", pro: "✓", enterprise: "✓" },
        { name: "Bulk operations", free: "—", pro: "✓", enterprise: "✓" },
      ],
    },
    {
      category: "AI Features",
      features: [
        { name: "AI recommendations", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
        { name: "Pattern learning", free: "—", pro: "✓", enterprise: "✓" },
        { name: "Context awareness", free: "—", pro: "✓", enterprise: "✓" },
        { name: "Predictive surfacing", free: "—", pro: "✓", enterprise: "✓" },
      ],
    },
    {
      category: "Sync & Access",
      features: [
        { name: "Device sync", free: "1 device", pro: "All devices", enterprise: "All devices" },
        { name: "Cross-browser sync", free: "—", pro: "✓", enterprise: "✓" },
        { name: "Offline access", free: "—", pro: "✓", enterprise: "✓" },
      ],
    },
    {
      category: "Analytics & Insights",
      features: [
        { name: "Usage statistics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
        { name: "Productivity insights", free: "—", pro: "✓", enterprise: "✓" },
        { name: "Custom reports", free: "—", pro: "—", enterprise: "✓" },
        { name: "Export data", free: "—", pro: "✓", enterprise: "✓" },
      ],
    },
    {
      category: "Support",
      features: [
        { name: "Support type", free: "Community", pro: "Priority", enterprise: "Dedicated" },
        { name: "Response time", free: "48h", pro: "24h", enterprise: "4h SLA" },
        { name: "Training", free: "—", pro: "—", enterprise: "Custom" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">SmartTab AI</span>
          </Link>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-hero hover:opacity-90 transition-opacity">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Pricing Plans
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade as you grow. All plans include 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`shadow-card relative ${
                plan.popular ? "border-primary shadow-glow" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-hero text-primary-foreground border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <CardDescription className="mb-6">{plan.description}</CardDescription>
                <div className="mb-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground ml-2">/ {plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Link to={plan.ctaLink}>
                  <Button
                    variant={plan.variant}
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-hero hover:opacity-90 transition-opacity"
                        : ""
                    }`}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Compare All Features
            </h2>
            <p className="text-xl text-muted-foreground">
              See what's included in each plan
            </p>
          </div>

          <Card className="shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold w-1/2">Feature</th>
                    <th className="text-center p-4 font-semibold">Free</th>
                    <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                    <th className="text-center p-4 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((category, categoryIndex) => (
                    <>
                      <tr key={`category-${categoryIndex}`} className="bg-muted/30">
                        <td colSpan={4} className="p-4 font-semibold text-sm">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featureIndex) => (
                        <tr
                          key={`feature-${categoryIndex}-${featureIndex}`}
                          className="border-b border-border last:border-0"
                        >
                          <td className="p-4 text-sm">{feature.name}</td>
                          <td className="p-4 text-center text-sm text-muted-foreground">
                            {feature.free}
                          </td>
                          <td className="p-4 text-center text-sm font-medium bg-primary/5">
                            {feature.pro}
                          </td>
                          <td className="p-4 text-center text-sm text-muted-foreground">
                            {feature.enterprise}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, American Express) and support annual billing for additional savings.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Is there a contract or can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No contracts required. You can cancel your subscription at any time, and you'll continue to have access until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center mt-20 p-12 rounded-3xl bg-gradient-hero shadow-glow">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
