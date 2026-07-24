import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Loader2, Shield, FlaskConical, MessageSquare, Bug, HelpCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { SubscriptionManager } from "@/components/admin/SubscriptionManager";
import { AdminRevenueCard } from "@/components/admin/AdminRevenueCard";
import { PaymentAnalyticsChart } from "@/components/admin/PaymentAnalyticsChart";
import { MockDataProvider, useMockData } from "@/contexts/MockDataContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SupportTicket {
  id: string;
  email: string;
  issue_type: string;
  subject: string;
  status: string;
  created_at: string;
}

const AdminContent = () => {
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
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
      loadSupportTickets();
    } else if (!checkingAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [isAdmin, checkingAdmin, navigate, toast]);

  const loadSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, email, issue_type, subject, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSupportTickets(data || []);
    } catch (error: any) {
      console.error("Error loading support tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case "bug":
        return <Bug className="w-4 h-4 text-destructive" />;
      case "help":
        return <HelpCircle className="w-4 h-4 text-primary" />;
      case "feedback":
        return <MessageSquare className="w-4 h-4 text-accent" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="destructive">Open</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "resolved":
        return <Badge variant="secondary">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const { useMockData: isMockData, setUseMockData } = useMockData();

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
          <div className="flex items-center gap-4">
            {/* Mock Data Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
              <FlaskConical className={`w-4 h-4 ${isMockData ? "text-amber-500" : "text-muted-foreground"}`} />
              <Label htmlFor="mock-toggle" className="text-sm font-medium cursor-pointer">
                Test Data
              </Label>
              <Switch
                id="mock-toggle"
                checked={isMockData}
                onCheckedChange={setUseMockData}
              />
            </div>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Open Tickets</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {supportTickets.filter(t => t.status === "open").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <Bug className="inline w-3 h-3 mr-1" />
                Require attention
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {supportTickets.filter(t => t.status === "in_progress").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <HelpCircle className="inline w-3 h-3 mr-1" />
                Being handled
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total Tickets</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {supportTickets.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <MessageSquare className="inline w-3 h-3 mr-1" />
                All time
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

        {/* Support Tickets Table */}
        <Card className="shadow-card mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Support Tickets</CardTitle>
                <CardDescription>Recent bug reports and support requests</CardDescription>
              </div>
              <Button onClick={loadSupportTickets} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : supportTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No support tickets yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getIssueTypeIcon(ticket.issue_type)}
                          <span className="capitalize">{ticket.issue_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>{ticket.email}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
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

const Admin = () => {
  return (
    <MockDataProvider>
      <AdminContent />
    </MockDataProvider>
  );
};

export default Admin;
