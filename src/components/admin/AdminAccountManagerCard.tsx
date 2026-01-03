import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Calendar, Search, ChevronRight, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface UserSubscription {
  user_id: string;
  email: string;
  full_name: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_activity: string | null;
  is_active: boolean;
}

export const AdminAccountManagerCard = () => {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-subscriptions");
      if (error) throw error;
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case "active":
        return matchesSearch && user.is_active;
      case "inactive":
        return matchesSearch && !user.is_active;
      case "pro":
        return matchesSearch && user.status === "active";
      case "trial":
        return matchesSearch && user.status === "trialing";
      default:
        return matchesSearch;
    }
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    pro: users.filter((u) => u.status === "active").length,
    trial: users.filter((u) => u.status === "trialing").length,
  };

  const displayedUsers = filteredUsers.slice(0, 5);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Account Manager</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/admin")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Full Admin Panel <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        <CardDescription>Quick overview of user accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Total</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="text-lg font-bold text-green-500">{stats.active}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Active</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <div className="text-lg font-bold text-primary">{stats.pro}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Pro</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <div className="text-lg font-bold text-amber-500">{stats.trial}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Trial</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
        ) : displayedUsers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">No users found</div>
        ) : (
          <div className="space-y-2">
            {displayedUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.full_name || user.email.split("@")[0]}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.status === "active" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary">
                      <Crown className="h-2.5 w-2.5 mr-0.5" />
                      Pro
                    </Badge>
                  )}
                  {user.status === "trialing" && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-500">
                      Trial
                    </Badge>
                  )}
                  {user.last_activity && (
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                      {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All Link */}
        {filteredUsers.length > 5 && (
          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-xs text-muted-foreground"
            >
              View all {filteredUsers.length} users
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
