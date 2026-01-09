import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, Search, UserCheck, UserX, Calendar, Activity, Users, RefreshCw, Edit, Shield, DollarSign, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserSubscription {
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  current_period_start: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  last_activity: string | null;
  is_active: boolean;
  stripe_subscription_id: string | null;
  is_admin?: boolean;
  custom_price?: number | null;
  billing_interval?: string | null;
  payment_status?: string | null;
}

type FilterType = "all" | "active" | "inactive" | "pro" | "trial" | "expired";
type PaymentFilterType = "all" | "succeeded" | "failed";

// Mock data for testing
const generateMockUsers = (): UserSubscription[] => {
  const statuses = ["active", "trial", "expired", "cancelled"];
  const paymentStatuses = ["succeeded", "failed", null, "succeeded", "succeeded"];
  const names = [
    "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown", "Eva Martinez",
    "Frank Garcia", "Grace Lee", "Henry Wilson", "Ivy Chen", "Jack Taylor",
    "Kate Anderson", "Leo Thomas", "Maria Rodriguez", "Nathan White", "Olivia Harris"
  ];
  
  const mockUsers: UserSubscription[] = [
    {
      user_id: "owner-001",
      email: "corranforce@gmail.com",
      full_name: "Platform Owner",
      status: "active",
      trial_ends_at: null,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_start: new Date().toISOString(),
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_sign_in_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      is_active: true,
      stripe_subscription_id: "sub_owner",
      is_admin: true,
      custom_price: null,
      billing_interval: "year",
      payment_status: "succeeded",
    }
  ];
  
  for (let i = 0; i < 14; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isActive = Math.random() > 0.3;
    const daysAgo = Math.floor(Math.random() * 60);
    const paymentStatus = status === "active" ? paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)] : null;
    
    mockUsers.push({
      user_id: `user-${i + 1}`,
      email: `${names[i].toLowerCase().replace(' ', '.')}@example.com`,
      full_name: names[i],
      status,
      trial_ends_at: status === "trial" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      current_period_end: status === "active" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      current_period_start: status === "active" ? new Date().toISOString() : null,
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      last_sign_in_at: isActive ? new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_activity: isActive ? new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000).toISOString() : null,
      is_active: isActive,
      stripe_subscription_id: status === "active" ? `sub_${i}` : null,
      is_admin: false,
      custom_price: Math.random() > 0.85 ? Math.floor(Math.random() * 5 + 3) : null,
      billing_interval: status === "active" ? (Math.random() > 0.7 ? "year" : "month") : null,
      payment_status: paymentStatus,
    });
  }
  
  return mockUsers;
};

// Set to true to use mock data for testing
const USE_MOCK_DATA = true;

export const SubscriptionManager = () => {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>("all");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [newBillingDate, setNewBillingDate] = useState("");
  const [retryingPayment, setRetryingPayment] = useState<string | null>(null);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editUserPrice, setEditUserPrice] = useState("");
  const [editUserStatus, setEditUserStatus] = useState("");
  const [editUserBillingDate, setEditUserBillingDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setUsers(generateMockUsers());
        return;
      }

      const { data, error } = await supabase.functions.invoke("admin-list-subscriptions");

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load user subscriptions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const grantProAccess = async (userId: string) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { userId, action: "grant_pro" },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pro access granted successfully.",
      });
      loadUsers();
    } catch (error: any) {
      console.error("Error granting pro access:", error);
      toast({
        title: "Error",
        description: "Failed to grant pro access.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const revokeProAccess = async (userId: string) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { userId, action: "revoke_pro" },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pro access revoked.",
      });
      loadUsers();
    } catch (error: any) {
      console.error("Error revoking pro access:", error);
      toast({
        title: "Error",
        description: "Failed to revoke pro access.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const updateBillingDate = async () => {
    if (!selectedUser || !newBillingDate) return;
    
    setUpdatingUser(selectedUser.user_id);
    try {
      const { error } = await supabase.functions.invoke("admin-update-subscription", {
        body: { 
          userId: selectedUser.user_id, 
          action: "update_billing_date",
          billingDate: newBillingDate 
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Billing date updated successfully.",
      });
      setBillingDialogOpen(false);
      setSelectedUser(null);
      setNewBillingDate("");
      loadUsers();
    } catch (error: any) {
      console.error("Error updating billing date:", error);
      toast({
        title: "Error",
        description: "Failed to update billing date.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const openBillingDialog = (user: UserSubscription) => {
    setSelectedUser(user);
    setNewBillingDate(user.current_period_end?.split("T")[0] || "");
    setBillingDialogOpen(true);
  };

  const openEditUserDialog = (user: UserSubscription) => {
    setSelectedUser(user);
    setEditUserPrice(user.custom_price ? user.custom_price.toString() : "");
    setEditUserStatus(user.status);
    setEditUserBillingDate(user.current_period_end?.split("T")[0] || "");
    setEditUserDialogOpen(true);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    
    setUpdatingUser(selectedUser.user_id);
    try {
      // Update custom price if provided
      if (editUserPrice && parseFloat(editUserPrice) > 0) {
        const { error } = await supabase.functions.invoke("admin-update-subscription", {
          body: { 
            userId: selectedUser.user_id, 
            action: "update_custom_price",
            customPrice: editUserPrice 
          },
        });
        if (error) throw error;
        toast({
          title: "Custom Price Applied",
          description: `Custom price of $${editUserPrice}/month has been set in Stripe.`,
        });
      }

      // Update billing date if changed
      if (editUserBillingDate && editUserBillingDate !== selectedUser.current_period_end?.split("T")[0]) {
        const { error } = await supabase.functions.invoke("admin-update-subscription", {
          body: { 
            userId: selectedUser.user_id, 
            action: "update_billing_date",
            billingDate: editUserBillingDate 
          },
        });
        if (error) throw error;
      }

      // Update status if changed
      if (editUserStatus && editUserStatus !== selectedUser.status) {
        if (editUserStatus === "active" && selectedUser.status !== "active") {
          await supabase.functions.invoke("admin-update-subscription", {
            body: { userId: selectedUser.user_id, action: "grant_pro" },
          });
        } else if (editUserStatus !== "active" && selectedUser.status === "active") {
          await supabase.functions.invoke("admin-update-subscription", {
            body: { userId: selectedUser.user_id, action: "revoke_pro" },
          });
        }
      }

      toast({
        title: "Success",
        description: "User subscription updated successfully.",
      });
      setEditUserDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user subscription.",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const retryPayment = async (user: UserSubscription) => {
    if (!user.stripe_subscription_id) {
      toast({
        title: "Cannot Retry",
        description: "This user does not have a Stripe subscription.",
        variant: "destructive",
      });
      return;
    }

    setRetryingPayment(user.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-retry-payment", {
        body: { userId: user.user_id },
      });

      if (error) throw error;

      toast({
        title: "Payment Retried",
        description: data.message || "Payment retry initiated successfully.",
      });
      loadUsers();
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to retry payment.",
        variant: "destructive",
      });
    } finally {
      setRetryingPayment(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    // Text search
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Payment filter
    if (paymentFilter !== "all") {
      if (paymentFilter === "succeeded" && user.payment_status !== "succeeded") return false;
      if (paymentFilter === "failed" && user.payment_status !== "failed") return false;
    }

    // Filter by type
    switch (filterType) {
      case "active":
        return user.is_active;
      case "inactive":
        return !user.is_active;
      case "pro":
        return user.status === "active";
      case "trial":
        return user.status === "trial";
      case "expired":
        return user.status === "expired";
      default:
        return true;
    }
  });

  const getStatusBadge = (user: UserSubscription) => {
    const badges = [];
    
    // Platform Owner - special case for corranforce@gmail.com
    const isPlatformOwner = user.email === "corranforce@gmail.com";
    
    if (isPlatformOwner) {
      badges.push(
        <Badge key="owner" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          <Shield className="w-3 h-3 mr-1" />
          Platform-Owner
        </Badge>
      );
      return <div className="flex gap-1 flex-wrap">{badges}</div>;
    }
    
    // Show Owner badge for other admins
    if (user.is_admin) {
      badges.push(
        <Badge key="owner" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
          <Shield className="w-3 h-3 mr-1" />
          Owner
        </Badge>
      );
    }
    
    // Show subscription status
    switch (user.status) {
      case "active":
        badges.push(<Badge key="status" className="bg-green-500/10 text-green-500 border-green-500/20">Pro</Badge>);
        break;
      case "trial":
        badges.push(<Badge key="status" variant="secondary">Trial</Badge>);
        break;
      case "expired":
        badges.push(<Badge key="status" variant="destructive">Expired</Badge>);
        break;
      case "cancelled":
        badges.push(<Badge key="status" variant="outline">Cancelled</Badge>);
        break;
      default:
        badges.push(<Badge key="status" variant="outline">{user.status}</Badge>);
    }
    
    // Show custom price if set
    if (user.custom_price) {
      badges.push(
        <Badge key="price" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
          <DollarSign className="w-3 h-3 mr-0.5" />
          {user.custom_price}/mo
        </Badge>
      );
    }
    
    return <div className="flex gap-1 flex-wrap">{badges}</div>;
  };

  const getActivityBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        <Activity className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        <Activity className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const proUsers = users.filter(u => u.status === "active").length;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Account Management
              </CardTitle>
              <CardDescription>Manage user subscriptions, activity, and billing</CardDescription>
            </div>
            <Button onClick={loadUsers} variant="outline" size="sm" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
          
          {/* Stats Row */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{totalUsers}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold">{activeUsers}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-muted-foreground">Pro:</span>
              <span className="font-semibold">{proUsers}</span>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active (7d)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilterType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="succeeded">Successful</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || filterType !== "all" ? "No users match your filters." : "No users found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Billing Ends</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow 
                    key={user.user_id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditUserDialog(user)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getActivityBadge(user.is_active)}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(user.last_activity)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.current_period_end)}
                    </TableCell>
                    <TableCell>
                      {user.payment_status === "succeeded" ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Paid
                        </Badge>
                      ) : user.payment_status === "failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      ) : user.stripe_subscription_id ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          <MinusCircle className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Edit User Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditUserDialog(user)}
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        {/* Retry Payment Button */}
                        {user.stripe_subscription_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryPayment(user)}
                            disabled={retryingPayment === user.user_id}
                            title="Retry payment"
                          >
                            {retryingPayment === user.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* Grant/Revoke Access */}
                        {user.status === "active" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingUser === user.user_id}
                              >
                                {updatingUser === user.user_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserX className="w-4 h-4 mr-1" />
                                    Revoke
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Pro Access?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove pro access for {user.email}. They will lose access to
                                  premium features immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeProAccess(user.user_id)}>
                                  Revoke Access
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => grantProAccess(user.user_id)}
                            disabled={updatingUser === user.user_id}
                          >
                            {updatingUser === user.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-1" />
                                Grant Pro
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Billing Date Dialog */}
        <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Billing Date</DialogTitle>
              <DialogDescription>
                Set the next billing date for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="billingDate">Next Billing Date</Label>
              <Input
                id="billingDate"
                type="date"
                value={newBillingDate}
                onChange={(e) => setNewBillingDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBillingDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={updateBillingDate} 
                disabled={!newBillingDate || updatingUser === selectedUser?.user_id}
              >
                {updatingUser === selectedUser?.user_id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Update Date
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog - Centered Modal */}
        <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit User Subscription
              </DialogTitle>
              <DialogDescription>
                Manage subscription details for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* User Info */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedUser?.full_name || "No name"}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                {selectedUser?.is_admin && (
                  <Badge className="mt-2 bg-purple-500/10 text-purple-500 border-purple-500/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>

              {/* Subscription Status */}
              <div className="space-y-2">
                <Label htmlFor="editStatus">Subscription Status</Label>
                <Select value={editUserStatus} onValueChange={setEditUserStatus}>
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Pro (Active)</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Billing Date */}
              <div className="space-y-2">
                <Label htmlFor="editBillingDate">Next Billing Date</Label>
                <Input
                  id="editBillingDate"
                  type="date"
                  value={editUserBillingDate}
                  onChange={(e) => setEditUserBillingDate(e.target.value)}
                />
              </div>

              {/* Custom Price (optional) */}
              <div className="space-y-2">
                <Label htmlFor="editPrice" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Custom {selectedUser?.billing_interval === 'year' ? 'Yearly' : 'Monthly'} Price (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="editPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={selectedUser?.custom_price ? selectedUser.custom_price.toString() : "9.99"}
                    value={editUserPrice}
                    onChange={(e) => setEditUserPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {selectedUser?.custom_price 
                      ? `Current custom price: $${selectedUser.custom_price}/${selectedUser?.billing_interval === 'year' ? 'year' : 'month'}`
                      : `Creates a custom Stripe price and updates the user's subscription. Leave empty to keep current pricing.`
                    }
                  </p>
                  {selectedUser?.custom_price && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto py-1 px-2 text-xs"
                      onClick={async () => {
                        if (!selectedUser) return;
                        setUpdatingUser(selectedUser.user_id);
                        try {
                          const { error } = await supabase.functions.invoke("admin-update-subscription", {
                            body: { userId: selectedUser.user_id, action: "clear_custom_price" },
                          });
                          if (error) throw error;
                          toast({
                            title: "Custom Price Cleared",
                            description: "User has been reverted to standard pricing.",
                          });
                          setEditUserDialogOpen(false);
                          loadUsers();
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to clear custom price.",
                            variant: "destructive",
                          });
                        } finally {
                          setUpdatingUser(null);
                        }
                      }}
                      disabled={updatingUser === selectedUser?.user_id}
                    >
                      Clear Custom Price
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveUserEdits} 
                disabled={updatingUser === selectedUser?.user_id}
              >
                {updatingUser === selectedUser?.user_id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
