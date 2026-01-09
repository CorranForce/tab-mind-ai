import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Users, Mail, Download, ArrowLeft, Loader2, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { AdminRevenueCard } from "@/components/admin/AdminRevenueCard";
import { PaymentAnalyticsChart } from "@/components/admin/PaymentAnalyticsChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
  user_id: string | null;
}

const Admin = () => {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: checkingAdmin } = useAdminRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!checkingAdmin && isAdmin) {
      loadWaitlist();
    } else if (!checkingAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isAdmin, checkingAdmin, navigate, toast]);

  const loadWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from("extension_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaitlist(data || []);
    } catch (error: any) {
      console.error("Error loading waitlist:", error);
      toast({
        title: "Error",
        description: "Failed to load waitlist data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportWaitlist = () => {
    const csv = [
      ["Email", "Signed Up", "Has Account"],
      ...waitlist.map(entry => [
        entry.email,
        new Date(entry.created_at).toLocaleString(),
        entry.user_id ? "Yes" : "No"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${waitlist.length} entries exported to CSV.`,
    });
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
            <Badge variant="secondary" className="ml-2">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total Waitlist</CardDescription>
              <CardTitle className="text-3xl font-bold">{waitlist.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Mail className="inline w-3 h-3 mr-1" />
                Emails collected
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Registered Users</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {waitlist.filter(e => e.user_id).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Users className="inline w-3 h-3 mr-1" />
                Have accounts
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Guest Signups</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {waitlist.filter(e => !e.user_id).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Mail className="inline w-3 h-3 mr-1" />
                No account yet
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <AdminRevenueCard />
          <PaymentAnalyticsChart />
        </div>

        {/* Subscription Management */}
        <SubscriptionManager />

        {/* Waitlist Table */}
        <Card className="shadow-card mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Extension Waitlist</CardTitle>
                <CardDescription>Users waiting for the browser extension</CardDescription>
              </div>
              <Button onClick={exportWaitlist} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : waitlist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No waitlist entries yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {entry.user_id ? (
                          <Badge variant="default">Registered</Badge>
                        ) : (
                          <Badge variant="secondary">Guest</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
