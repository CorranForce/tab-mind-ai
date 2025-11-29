import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink, Archive, Clock, TrendingUp, Sparkles, CreditCard, User, LogOut, Settings, Crown, Loader2, Lock } from "lucide-react";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { FeatureComparisonModal } from "@/components/FeatureComparisonModal";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Mock data for demonstration
const mockRecommendations = [
  {
    id: 1,
    title: "Linear - Issue Tracker",
    url: "https://linear.app/issues",
    favicon: "🎯",
    reason: "You often use this after checking Slack",
    score: 0.95,
  },
  {
    id: 2,
    title: "GitHub - smarttab-ai/extension",
    url: "https://github.com/smarttab-ai",
    favicon: "⚙️",
    reason: "Related to your current coding session",
    score: 0.89,
  },
  {
    id: 3,
    title: "Figma - Design System",
    url: "https://figma.com/design-system",
    favicon: "🎨",
    reason: "You review designs every Tuesday morning",
    score: 0.82,
  },
];

const mockRecentTabs = [
  { id: 4, title: "Slack - Engineering", url: "https://slack.com", favicon: "💬", lastAccessed: "2 min ago" },
  { id: 5, title: "Gmail - Inbox", url: "https://gmail.com", favicon: "📧", lastAccessed: "15 min ago" },
  { id: 6, title: "Notion - Product Roadmap", url: "https://notion.so", favicon: "📝", lastAccessed: "1 hour ago" },
];

const mockArchivedTabs = [
  { id: 7, title: "Old Documentation", url: "https://docs.example.com", archivedDate: "3 days ago" },
  { id: 8, title: "Tutorial Video", url: "https://youtube.com", archivedDate: "1 week ago" },
];

const Dashboard = () => {
  const [activeView, setActiveView] = useState<"recommendations" | "recent" | "archived">("recommendations");
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro, subscriptionEnd, openCustomerPortal } = useSubscription();

  useEffect(() => {
    checkAuth();
    loadSubscription();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error: any) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrial = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("subscriptions")
        .update({ 
          status: "cancelled",
          cancel_at_period_end: true 
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Trial cancelled",
        description: "Your trial has been cancelled. You can still use the service until it expires.",
      });

      loadSubscription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

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
            <Link to="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/payment-methods" className="flex items-center cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Methods
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm">
              Install Extension
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Active Tabs</CardDescription>
              <CardTitle className="text-3xl font-bold">24</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1" />
                8 more than yesterday
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Tabs Saved Today</CardDescription>
              <CardTitle className="text-3xl font-bold">12</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Sparkles className="inline w-3 h-3 mr-1" />
                AI organized for you
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Archived</CardDescription>
              <CardTitle className="text-3xl font-bold">147</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Archive className="inline w-3 h-3 mr-1" />
                Can restore anytime
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Time Saved</CardDescription>
              <CardTitle className="text-3xl font-bold">2.4h</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Clock className="inline w-3 h-3 mr-1" />
                This week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Tab Lists */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Smart Recommendations
                    </CardTitle>
                    <CardDescription>Tabs AI thinks you need right now</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={activeView === "recommendations" ? "default" : "ghost"}
                      onClick={() => setActiveView("recommendations")}
                    >
                      Recommended
                    </Button>
                    <Button
                      size="sm"
                      variant={activeView === "recent" ? "default" : "ghost"}
                      onClick={() => setActiveView("recent")}
                    >
                      Recent
                    </Button>
                    <Button
                      size="sm"
                      variant={activeView === "archived" ? "default" : "ghost"}
                      onClick={() => setActiveView("archived")}
                    >
                      Archived
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeView === "recommendations" && (
                  <div className="space-y-4">
                    {(isPro ? mockRecommendations : mockRecommendations.slice(0, 1)).map((tab) => (
                      <div
                        key={tab.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-glow cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{tab.favicon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                {tab.title}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(tab.score * 100)}% match
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {tab.url}
                            </p>
                            <p className="text-sm text-accent flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {tab.reason}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!isPro && (
                      <div 
                        className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">2 more recommendations available</p>
                            <p className="text-xs text-muted-foreground">Upgrade to Pro for unlimited AI recommendations</p>
                          </div>
                          <Button size="sm">
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeView === "recent" && (
                  <div className="space-y-3">
                    {mockRecentTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{tab.favicon}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{tab.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Last accessed {tab.lastAccessed}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeView === "archived" && (
                  <div className="space-y-3">
                    {mockArchivedTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{tab.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Archived {tab.archivedDate}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Restore
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - AI Insights */}
          <div className="space-y-6">
            {isPro ? (
              <Card className="shadow-card border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-sm font-medium mb-1">Pattern Detected</p>
                    <p className="text-sm text-muted-foreground">
                      You typically work on GitHub between 9-11 AM
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium mb-1">Suggestion</p>
                    <p className="text-sm text-muted-foreground">
                      Group your design tools tabs for faster access
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-sm font-medium mb-1">Archive Ready</p>
                    <p className="text-sm text-muted-foreground">
                      8 tabs haven't been used in 5+ days
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <UpgradePrompt 
                feature="AI Insights" 
                description="Get personalized patterns, suggestions, and smart archive recommendations based on your browsing behavior."
              />
            )}

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Extension Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Extension not detected
                  </p>
                  <Button className="w-full">
                    Install Extension
                  </Button>
                </div>
              </CardContent>
            </Card>

            {isPro && (
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
            )}

            {!loading && !isPro && subscription && subscription.status === "trial" && (
              <Card className="shadow-card border-destructive/20">
                <CardHeader>
                  <CardTitle>Trial Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm font-medium mb-1">Trial Period</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.trial_ends_at
                          ? `Ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                          : "Active"}
                      </p>
                    </div>
                    {!subscription.cancel_at_period_end && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full" size="sm">
                            Cancel Trial
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel trial?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You will still have access until your trial period ends. You can reactivate anytime before it expires.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Trial</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelTrial}>
                              Cancel Trial
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {subscription.cancel_at_period_end && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive">Trial will be cancelled at period end</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <FeatureComparisonModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        highlightFeature="AI Recommendations"
      />
    </div>
  );
};

export default Dashboard;
