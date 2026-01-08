import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Settings, Loader2, Shield, Sparkles } from "lucide-react";

interface PlatformOwnerOrProCardProps {
  isAdmin: boolean;
  subscriptionEnd: string | null;
  portalLoading: boolean;
  handleManageSubscription: () => void;
}

export const PlatformOwnerOrProCard = ({
  isAdmin,
  subscriptionEnd,
  portalLoading,
  handleManageSubscription,
}: PlatformOwnerOrProCardProps) => {
  // Platform Owner card for corranforce@gmail.com (admin)
  if (isAdmin) {
    return (
      <Card className="shadow-card border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Platform-Owner
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <p className="text-sm font-medium mb-1 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                Full Access
              </p>
              <p className="text-sm text-muted-foreground">
                All current & future features unlocked
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Account Type</p>
              <p className="text-sm text-muted-foreground">
                Lifetime Platform Owner
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular Pro subscription card
  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Pro Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium mb-1">Active Plan</p>
            <p className="text-sm text-muted-foreground">
              SmartTab AI Pro
            </p>
          </div>
          {subscriptionEnd && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-1">Next Billing</p>
              <p className="text-sm text-muted-foreground">
                {new Date(subscriptionEnd).toLocaleDateString()}
              </p>
            </div>
          )}
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={handleManageSubscription}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
