import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingCardsProps {
  isAuthenticated: boolean;
  isPro: boolean;
  subscriptionLoading: boolean;
  checkoutLoading: string | null;
  onSubscribe: (planName: string) => void;
}

export const PricingCards = ({
  isAuthenticated,
  isPro,
  subscriptionLoading,
  checkoutLoading,
  onSubscribe,
}: PricingCardsProps) => {
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
      cta: "Start Free",
      ctaLink: isAuthenticated ? "/dashboard" : "/auth",
      variant: "outline" as const,
      popular: false,
      isCurrentPlan: !isPro && isAuthenticated,
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
      cta: isPro ? "Current Plan" : "Start 14-Day Trial",
      ctaLink: isAuthenticated ? "/dashboard" : "/auth",
      variant: "default" as const,
      popular: true,
      isCurrentPlan: isPro,
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
      cta: "Contact Sales",
      ctaLink: "#contact",
      variant: "outline" as const,
      popular: false,
      isCurrentPlan: false,
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={`shadow-card relative ${
            plan.popular ? "border-primary shadow-glow" : ""
          } ${plan.isCurrentPlan ? "ring-2 ring-primary" : ""}`}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-hero text-primary-foreground border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
          )}
          {plan.isCurrentPlan && (
            <div className="absolute -top-4 right-4">
              <Badge variant="secondary">Your Plan</Badge>
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
            {plan.name === "Pro" && !plan.isCurrentPlan ? (
              <Button
                variant={plan.variant}
                className={`w-full ${
                  plan.popular
                    ? "bg-gradient-hero hover:opacity-90 transition-opacity"
                    : ""
                }`}
                size="lg"
                onClick={() => onSubscribe(plan.name)}
                disabled={subscriptionLoading || checkoutLoading === plan.name}
              >
                {checkoutLoading === plan.name ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            ) : plan.isCurrentPlan ? (
              <Button
                variant="secondary"
                className="w-full"
                size="lg"
                disabled
              >
                <Check className="w-4 h-4 mr-2" />
                Current Plan
              </Button>
            ) : (
              <Link to={plan.ctaLink}>
                <Button
                  variant={plan.variant}
                  className="w-full"
                  size="lg"
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
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
  );
};
