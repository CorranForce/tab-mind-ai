import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { FeatureComparisonModal } from "./FeatureComparisonModal";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
}

export const UpgradePrompt = ({ feature, description, compact = false }: UpgradePromptProps) => {
  const [showModal, setShowModal] = useState(false);

  if (compact) {
    return (
      <>
        <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
          <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">{feature}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {description || "Upgrade to Pro to unlock this feature"}
          </p>
          <Button size="sm" className="w-full" onClick={() => setShowModal(true)}>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
        </div>
        <FeatureComparisonModal 
          open={showModal} 
          onOpenChange={setShowModal} 
          highlightFeature={feature}
        />
      </>
    );
  }

  return (
    <>
      <Card className="shadow-card border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-primary" />
            {feature}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {description || "This premium feature is available for Pro subscribers."}
          </p>
          <Button className="w-full" onClick={() => setShowModal(true)}>
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
      <FeatureComparisonModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        highlightFeature={feature}
      />
    </>
  );
};
