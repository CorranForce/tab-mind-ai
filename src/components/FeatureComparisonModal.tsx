import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Sparkles, Brain, Archive, Zap } from "lucide-react";
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
    icon: Archive,
  },
  {
    name: "Recent Tabs History",
    description: "Access recently visited tabs",
    free: true,
    pro: true,
    icon: Archive,
  },
  {
    name: "AI Recommendations",
    description: "Smart tab suggestions based on your behavior",
    free: "Limited (1)",
    pro: "Unlimited",
    icon: Brain,
  },
  {
    name: "AI Insights",
    description: "Pattern detection & personalized suggestions",
    free: false,
    pro: true,
    icon: Sparkles,
  },
  {
    name: "Advanced Analytics",
    description: "Detailed usage statistics and trends",
    free: false,
    pro: true,
    icon: Zap,
  },
  {
    name: "Multi-device Sync",
    description: "Sync tabs across all your devices",
    free: false,
    pro: true,
    icon: Zap,
  },
  {
    name: "Priority Support",
    description: "Get help faster with priority access",
    free: false,
    pro: true,
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
          <div className="grid grid-cols-[1fr_80px_80px] gap-4 pb-3 border-b border-border">
            <div className="text-sm font-medium text-muted-foreground">Feature</div>
            <div className="text-sm font-medium text-center">Free</div>
            <div className="text-sm font-medium text-center text-primary">Pro</div>
          </div>

          {/* Features */}
          <div className="divide-y divide-border">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isHighlighted = highlightFeature && feature.name.toLowerCase().includes(highlightFeature.toLowerCase());
              
              return (
                <div
                  key={feature.name}
                  className={`grid grid-cols-[1fr_80px_80px] gap-4 py-3 items-center transition-colors ${
                    isHighlighted ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className={`text-sm font-medium ${isHighlighted ? "text-primary" : ""}`}>
                        {feature.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-center">{renderValue(feature.free)}</div>
                  <div className="flex justify-center">{renderValue(feature.pro)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Link to="/pricing" className="flex-1">
            <Button className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro - $12/mo
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
