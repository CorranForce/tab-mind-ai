import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Sparkles, Brain, Archive, Zap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

interface FeatureComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightFeature?: string;
}

const features = [
  {
    name: "Basic Tab Management",
    description: "View and organize your tabs",
    free: true,
    pro: true,
    enterprise: true,
    icon: Archive,
  },
  {
    name: "Recent Tabs History",
    description: "Access recently visited tabs",
    free: true,
    pro: true,
    enterprise: true,
    icon: Archive,
  },
  {
    name: "AI Recommendations",
    description: "Smart tab suggestions based on your behavior",
    free: "Limited (1)",
    pro: "Unlimited",
    enterprise: "Unlimited",
    icon: Brain,
  },
  {
    name: "AI Insights",
    description: "Pattern detection & personalized suggestions",
    free: false,
    pro: true,
    enterprise: true,
    icon: Sparkles,
  },
  {
    name: "Advanced Analytics",
    description: "Detailed usage statistics and trends",
    free: false,
    pro: true,
    enterprise: true,
    icon: Zap,
  },
  {
    name: "Multi-device Sync",
    description: "Sync tabs across all your devices",
    free: false,
    pro: true,
    enterprise: true,
    icon: Zap,
  },
  {
    name: "Priority Support",
    description: "Get help faster with priority access",
    free: false,
    pro: true,
    enterprise: true,
    icon: Crown,
  },
  {
    name: "Custom Reports",
    description: "Generate tailored analytics reports",
    free: false,
    pro: false,
    enterprise: true,
    icon: Sparkles,
  },
  {
    name: "API Access",
    description: "Integrate with your existing tools",
    free: false,
    pro: false,
    enterprise: true,
    icon: Zap,
  },
  {
    name: "Dedicated Support",
    description: "Personal account manager & SLA",
    free: false,
    pro: false,
    enterprise: true,
    icon: Crown,
  },
  {
    name: "Team Management",
    description: "Admin controls & user permissions",
    free: false,
    pro: false,
    enterprise: true,
    icon: Crown,
  },
];

export const FeatureComparisonModal = ({
  open,
  onOpenChange,
  highlightFeature,
}: FeatureComparisonModalProps) => {
  const renderValue = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="text-sm text-muted-foreground">{value}</span>;
    }
    return value ? (
      <Check className="w-5 h-5 text-primary" />
    ) : (
      <X className="w-5 h-5 text-muted-foreground/50" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-primary" />
            Unlock Premium Features
          </DialogTitle>
          <DialogDescription>
            Compare what you get with Free vs Pro plans
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Header */}
          <div className="grid grid-cols-[1fr_70px_70px_90px] gap-3 pb-3 border-b border-border">
            <div className="text-sm font-medium text-muted-foreground">Feature</div>
            <div className="text-sm font-medium text-center">Free</div>
            <div className="text-sm font-medium text-center text-primary">Pro</div>
            <div className="text-sm font-medium text-center flex items-center justify-center gap-1">
              <Building2 className="w-3 h-3" />
              Enterprise
            </div>
          </div>

          {/* Features */}
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isHighlighted = highlightFeature && feature.name.toLowerCase().includes(highlightFeature.toLowerCase());
              const isEnterpriseOnly = !feature.free && !feature.pro && feature.enterprise;
              
              return (
                <div
                  key={feature.name}
                  className={`grid grid-cols-[1fr_70px_70px_90px] gap-3 py-3 items-center transition-colors ${
                    isHighlighted ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""
                  } ${isEnterpriseOnly ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isHighlighted ? "text-primary" : isEnterpriseOnly ? "text-amber-500" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${isHighlighted ? "text-primary" : ""}`}>
                        {feature.name}
                        {isEnterpriseOnly && (
                          <span className="ml-2 text-xs bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">
                            Enterprise
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-center">{renderValue(feature.free)}</div>
                  <div className="flex justify-center">{renderValue(feature.pro)}</div>
                  <div className="flex justify-center">{renderValue(feature.enterprise)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-3">
            <Link to="/pricing" className="flex-1">
              <Button className="w-full" variant="outline">
                <Crown className="w-4 h-4 mr-2" />
                Pro - $12/mo
              </Button>
            </Link>
            <Link to="/pricing" className="flex-1">
              <Button className="w-full">
                <Building2 className="w-4 h-4 mr-2" />
                Enterprise - $99/mo
              </Button>
            </Link>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
