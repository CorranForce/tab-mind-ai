import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, STRIPE_PRODUCTS } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { PricingHeader } from "@/components/pricing/PricingHeader";
import { PricingCards } from "@/components/pricing/PricingCards";
import { FeatureComparison } from "@/components/pricing/FeatureComparison";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { PricingCTA } from "@/components/pricing/PricingCTA";

const Pricing = () => {
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <PricingHeader isAuthenticated={isAuthenticated} />

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

        <PricingCTA isAuthenticated={isAuthenticated} />
      </section>
    </div>
  );
};

export default Pricing;
