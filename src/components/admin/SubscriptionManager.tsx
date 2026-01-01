import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, Search, UserCheck, UserX, Calendar, Activity, Users } from "lucide-react";
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
  DialogTrigger,
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
}

type FilterType = "all" | "active" | "inactive" | "pro" | "trial" | "expired";

export const SubscriptionManager = () => {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [newBillingDate, setNewBillingDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
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

  const filteredUsers = users.filter((user) => {
    // Text search
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pro</Badge>;
      case "trial":
        return <Badge variant="secondary">Trial</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getActivityBadge(user.is_active)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(user.last_activity)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.current_period_end)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Billing Date Button */}
                        {user.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openBillingDialog(user)}
                            title="Edit billing date"
                          >
                            <Calendar className="w-4 h-4" />
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
      </CardContent>
    </Card>
  );
};
