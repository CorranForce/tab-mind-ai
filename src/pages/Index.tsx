import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Brain, Zap, TrendingUp, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, STRIPE_PRODUCTS } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { PricingCards } from "@/components/pricing/PricingCards";
import { FeatureComparison } from "@/components/pricing/FeatureComparison";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isPro, isEnterprise, loading: subscriptionLoading, createCheckout } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleSubscribe = async (planName: string) => {
    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }

    if (planName === "Pro") {
      setCheckoutLoading("Pro");
      try {
        await createCheckout(STRIPE_PRODUCTS.pro.price_id);
      } catch (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to start checkout. Please try again.");
      } finally {
        setCheckoutLoading(null);
      }
    } else if (planName === "Enterprise") {
      setCheckoutLoading("Enterprise");
      try {
        await createCheckout(STRIPE_PRODUCTS.enterprise.price_id);
      } catch (error) {
        console.error("Checkout error:", error);
        toast.error("Failed to start checkout. Please try again.");
      } finally {
        setCheckoutLoading(null);
      }
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle scroll-smooth">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">SmartTab AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#pricing" 
              onClick={(e) => scrollToSection(e, 'pricing')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-hero hover:opacity-90 transition-opacity">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap className="w-4 h-4" />
            AI-Powered Tab Management
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
            Never Lose a Tab Again
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            SmartTab AI automatically organizes your browser tabs, surfaces what you need, and archives the rest. Zero manual work required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-hero hover:opacity-90 transition-opacity shadow-glow text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6 animate-in fade-in duration-700 delay-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Intelligent Tab Management</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powered by advanced AI that learns your behavior and predicts what you need
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Smart Predictions</h3>
            <p className="text-muted-foreground">
              AI learns your patterns and surfaces relevant tabs before you even think of them
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Auto-Archive</h3>
            <p className="text-muted-foreground">
              Unused tabs automatically archived after X days. Restore anytime with one click
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Context Awareness</h3>
            <p className="text-muted-foreground">
              Understands your current task and recommends related tabs automatically
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Privacy First</h3>
            <p className="text-muted-foreground">
              Your browsing data is encrypted and never shared. Full control over your data
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Zero Configuration</h3>
            <p className="text-muted-foreground">
              Install, sign in, and it works. No manual organization or tagging needed
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-glow transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Cross-Device Sync</h3>
            <p className="text-muted-foreground">
              Access your organized tabs across all devices. Seamless synchronization
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to intelligent tab management
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-xl">
              1
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Install Extension</h3>
              <p className="text-muted-foreground text-lg">
                Add SmartTab AI to Chrome. Sign in with email. That's it.
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-xl">
              2
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">AI Learns Your Patterns</h3>
              <p className="text-muted-foreground text-lg">
                Browse normally. Our AI observes what tabs you use, when, and why.
              </p>
            </div>
          </div>

          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-xl">
              3
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Get Smart Recommendations</h3>
              <p className="text-muted-foreground text-lg">
                Relevant tabs surface automatically. Unused tabs archive automatically. Zero work for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Pricing Plans
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your Plan
          </h2>
          <p className="text-xl text-muted-foreground">
            Start free, upgrade as you grow. All plans include 14-day free trial.
          </p>
        </div>

        <PricingCards
          isAuthenticated={isAuthenticated}
          isPro={isPro}
          isEnterprise={isEnterprise}
          subscriptionLoading={subscriptionLoading}
          checkoutLoading={checkoutLoading}
          onSubscribe={handleSubscribe}
        />

        <FeatureComparison />

        <PricingFAQ />
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-hero shadow-glow">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Master Your Tabs?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of users who've reclaimed their browser sanity
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

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

export default Index;
