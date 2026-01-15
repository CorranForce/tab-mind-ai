import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingUp, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
}

interface UsageStats {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  requestsByDay: { date: string; count: number }[];
  requestsByEndpoint: { endpoint: string; count: number }[];
  requestsByStatus: { status: string; count: number }[];
  requestsByKey: { keyName: string; count: number }[];
}

interface ApiUsageAnalyticsProps {
  apiKeys: ApiKey[];
}

const chartConfig = {
  requests: {
    label: "Requests",
    color: "hsl(var(--primary))",
  },
  success: {
    label: "Success",
    color: "hsl(var(--chart-2))",
  },
  error: {
    label: "Error",
    color: "hsl(var(--destructive))",
  },
};

const STATUS_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-4))",
];

export const ApiUsageAnalytics = ({ apiKeys }: ApiUsageAnalyticsProps) => {
  const [selectedKeyId, setSelectedKeyId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [stats, setStats] = useState<UsageStats>({
    totalRequests: 0,
    successRate: 0,
    avgResponseTime: 0,
    requestsByDay: [],
    requestsByEndpoint: [],
    requestsByStatus: [],
    requestsByKey: [],
  });
  const [loading, setLoading] = useState(true);

  const getDateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case "24h":
        start.setHours(start.getHours() - 24);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    
    return { start, end: now };
  }, [timeRange]);

  useEffect(() => {
    loadUsageStats();
  }, [selectedKeyId, timeRange, apiKeys]);

  const loadUsageStats = async () => {
    if (apiKeys.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { start, end } = getDateRange;
      
      let query = supabase
        .from("api_usage")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (selectedKeyId !== "all") {
        query = query.eq("api_key_id", selectedKeyId);
      } else {
        query = query.in("api_key_id", apiKeys.map(k => k.id));
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;

      const usageData = data || [];
      
      // Calculate statistics
      const totalRequests = usageData.length;
      const successCount = usageData.filter(u => u.status_code >= 200 && u.status_code < 400).length;
      const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
      const avgResponseTime = totalRequests > 0 
        ? usageData.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / totalRequests 
        : 0;

      // Group by day
      const dayMap = new Map<string, number>();
      usageData.forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap.set(date, (dayMap.get(date) || 0) + 1);
      });
      const requestsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

      // Group by endpoint
      const endpointMap = new Map<string, number>();
      usageData.forEach(u => {
        endpointMap.set(u.endpoint, (endpointMap.get(u.endpoint) || 0) + 1);
      });
      const requestsByEndpoint = Array.from(endpointMap.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Group by status
      const statusMap = new Map<string, number>();
      usageData.forEach(u => {
        const statusGroup = u.status_code >= 200 && u.status_code < 300 ? "2xx Success"
          : u.status_code >= 300 && u.status_code < 400 ? "3xx Redirect"
          : u.status_code >= 400 && u.status_code < 500 ? "4xx Client Error"
          : "5xx Server Error";
        statusMap.set(statusGroup, (statusMap.get(statusGroup) || 0) + 1);
      });
      const requestsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

      // Group by API key
      const keyMap = new Map<string, number>();
      usageData.forEach(u => {
        const key = apiKeys.find(k => k.id === u.api_key_id);
        const keyName = key?.name || "Unknown";
        keyMap.set(keyName, (keyMap.get(keyName) || 0) + 1);
      });
      const requestsByKey = Array.from(keyMap.entries())
        .map(([keyName, count]) => ({ keyName, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalRequests,
        successRate,
        avgResponseTime,
        requestsByDay,
        requestsByEndpoint,
        requestsByStatus,
        requestsByKey,
      });
    } catch (error) {
      console.error("Failed to load usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (apiKeys.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No API keys to track</p>
            <p className="text-sm">Create an API key to start seeing usage analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All API Keys" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All API Keys</SelectItem>
            {apiKeys.map(key => (
              <SelectItem key={key.id} value={key.id}>{key.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-2xl font-bold">{apiKeys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Requests Over Time */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Requests Over Time</CardTitle>
            <CardDescription>API requests per day</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.requestsByDay.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={stats.requestsByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="requests"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No usage data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Response Status Distribution</CardTitle>
            <CardDescription>Breakdown by HTTP status code</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.requestsByStatus.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie
                    data={stats.requestsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.requestsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No usage data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Endpoints */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Top Endpoints</CardTitle>
            <CardDescription>Most frequently called endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.requestsByEndpoint.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={stats.requestsByEndpoint} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="endpoint" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={120}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="requests" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No usage data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage by API Key */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Usage by API Key</CardTitle>
            <CardDescription>Requests per API key</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.requestsByKey.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={stats.requestsByKey} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="keyName" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={120}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" name="requests" fill="hsl(var(--chart-2))" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No usage data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};