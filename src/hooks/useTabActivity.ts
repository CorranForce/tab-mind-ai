import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TabActivity {
  id: string;
  url: string;
  title: string | null;
  favicon_url: string | null;
  domain: string | null;
  visit_count: number | null;
  last_visited_at: string | null;
  first_visited_at: string | null;
  is_archived: boolean | null;
  archived_at: string | null;
}

interface TabStats {
  totalTabs: number;
  archivedTabs: number;
  topDomains: { domain: string; count: number }[];
}

export const useTabActivity = () => {
  const [recentTabs, setRecentTabs] = useState<TabActivity[]>([]);
  const [archivedTabs, setArchivedTabs] = useState<TabActivity[]>([]);
  const [stats, setStats] = useState<TabStats>({
    totalTabs: 0,
    archivedTabs: 0,
    topDomains: [],
  });
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();

  const fetchTabActivity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent tabs (not archived)
      const { data: recent, error: recentError } = await supabase
        .from("tab_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("last_visited_at", { ascending: false })
        .limit(50);

      if (recentError) throw recentError;

      // Fetch archived tabs
      const { data: archived, error: archivedError } = await supabase
        .from("tab_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", true)
        .order("archived_at", { ascending: false })
        .limit(50);

      if (archivedError) throw archivedError;

      setRecentTabs(recent || []);
      setArchivedTabs(archived || []);
      setHasData((recent?.length || 0) > 0 || (archived?.length || 0) > 0);

      // Calculate stats
      const allTabs = [...(recent || []), ...(archived || [])];
      const domainCounts: Record<string, number> = {};
      allTabs.forEach((tab) => {
        if (tab.domain) {
          domainCounts[tab.domain] = (domainCounts[tab.domain] || 0) + 1;
        }
      });

      const topDomains = Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalTabs: recent?.length || 0,
        archivedTabs: archived?.length || 0,
        topDomains,
      });
    } catch (error: any) {
      console.error("Error fetching tab activity:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchTabActivity();

    // Set up realtime subscription
    const channel = supabase
      .channel("tab_activity_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tab_activity",
        },
        () => {
          // Refetch when data changes
          fetchTabActivity();
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTabActivity, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchTabActivity]);

  return {
    recentTabs,
    archivedTabs,
    stats,
    loading,
    hasData,
    refresh: fetchTabActivity,
  };
};
