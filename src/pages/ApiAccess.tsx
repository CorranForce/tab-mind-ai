import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Key, Plus, Copy, Trash2, Eye, EyeOff, Shield, ArrowLeft, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, STRIPE_PRODUCTS } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { ApiUsageAnalytics } from "@/components/api/ApiUsageAnalytics";
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

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

const ApiAccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEnterprise, loading: subscriptionLoading } = useSubscription();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    checkAuthAndAccess();
  }, [isEnterprise, subscriptionLoading]);

  const checkAuthAndAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    if (!subscriptionLoading && !isEnterprise) {
      toast({
        title: "Enterprise Only",
        description: "API Access is only available for Enterprise subscribers.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    if (isEnterprise) {
      loadApiKeys();
    }
  };

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_live_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const hashKey = async (key: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    setCreatingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fullKey = generateApiKey();
      const keyPrefix = fullKey.substring(0, 12) + '...';
      const keyHash = await hashKey(fullKey);

      const { error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          name: newKeyName.trim(),
          key_prefix: keyPrefix,
          key_hash: keyHash,
        });

      if (error) throw error;

      setNewlyCreatedKey(fullKey);
      setShowNewKey(true);
      setNewKeyName("");
      loadApiKeys();

      toast({
        title: "API Key Created",
        description: "Make sure to copy your key now. You won't be able to see it again!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", keyId);

      if (error) throw error;

      loadApiKeys();
      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked and can no longer be used.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setNewlyCreatedKey(null);
    setShowNewKey(false);
    setNewKeyName("");
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
          </Link>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">API Access</h1>
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Enterprise
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage your API keys to integrate SmartTab AI with your applications.
          </p>
        </div>

        {/* Security Notice */}
        <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-600">Security Notice</h3>
                <p className="text-sm text-muted-foreground">
                  API keys provide full access to your account. Keep them secure and never share them publicly. 
                  Revoke any keys you suspect have been compromised.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Keys and Analytics */}
        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Usage Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-6">
            {/* Create New Key */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>Generate a new API key for your integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Give your API key a descriptive name to help you identify it later.
                  </DialogDescription>
                </DialogHeader>
                
                {!newlyCreatedKey ? (
                  <>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="keyName">Key Name</Label>
                        <Input
                          id="keyName"
                          placeholder="e.g., Production Server, Development"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateKey} disabled={creatingKey}>
                        {creatingKey ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Key"
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 py-4">
                      <div className="p-4 rounded-lg bg-muted border">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Your new API key (copy it now - you won't see it again!)
                        </Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono break-all">
                            {showNewKey ? newlyCreatedKey : '•'.repeat(40)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewKey(!showNewKey)}
                          >
                            {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(newlyCreatedKey)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleDialogClose}>Done</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              {apiKeys.length} active key{apiKeys.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No API keys yet</p>
                <p className="text-sm">Create your first API key to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{key.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <code className="font-mono">{key.key_prefix}</code>
                        <span>
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        {key.last_used_at && (
                          <span>
                            Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke "{key.name}"? This action cannot be undone 
                            and any applications using this key will stop working immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevokeKey(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Documentation Link */}
        <Card className="mt-6 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">API Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Learn how to integrate SmartTab AI into your applications
                </p>
              </div>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <ApiUsageAnalytics apiKeys={apiKeys} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiAccess;
