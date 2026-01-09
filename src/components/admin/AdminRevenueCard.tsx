import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard, Users, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RevenueData {
  availableBalance: number;
  pendingBalance: number;
  monthlyRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  recentPayments: number;
  currency: string;
}

// Toggle this to switch between mock and real data
const USE_MOCK_DATA = true;

const generateMockRevenueData = (): RevenueData => ({
  availableBalance: 12450.75,
  pendingBalance: 3280.50,
  monthlyRevenue: 8750.00,
  mrr: 6200.00,
  activeSubscriptions: 47,
  recentPayments: 89,
  currency: "USD",
});

export const AdminRevenueCard = () => {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async () => {
    setLoading(true);
    
    if (USE_MOCK_DATA) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(generateMockRevenueData());
      setLoading(false);
      return;
    }
    
    try {
      const { data: revenueData, error } = await supabase.functions.invoke("admin-get-revenue");
      if (error) throw error;
      setData(revenueData);
    } catch (err) {
      console.error("Error fetching revenue:", err);
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: data?.currency || "USD",
    }).format(amount);
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRevenue}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>Real-time Stripe revenue metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            {/* Primary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">MRR</span>
                </div>
                <div className="text-xl font-bold text-green-500">
                  {formatCurrency(data.mrr)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">30-Day Revenue</span>
                </div>
                <div className="text-xl font-bold text-blue-500">
                  {formatCurrency(data.monthlyRevenue)}
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Available</span>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(data.availableBalance)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(data.pendingBalance)}
                </div>
              </div>
            </div>

            {/* Subscription Stats */}
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Active Subs:</span>
                <span className="font-semibold">{data.activeSubscriptions}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Payments (30d):</span>
                <span className="font-semibold">{data.recentPayments}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Failed to load revenue data
          </div>
        )}
      </CardContent>
    </Card>
  );
};
