import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft, Mail, AlertTriangle, CheckCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { usePasswordCheck } from "@/hooks/usePasswordCheck";

type AuthMode = "signin" | "signup" | "forgot";

// Validation schemas
const emailSchema = z.string().trim().email("Please enter a valid email address").max(255, "Email must be less than 255 characters");

const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password must be less than 72 characters");

const fullNameSchema = z.string()
  .trim()
  .min(1, "Full name is required")
  .max(100, "Name must be less than 100 characters");

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [passwordBreached, setPasswordBreached] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkPasswordBreached, isChecking } = usePasswordCheck();

  // Check if this is an extension login flow
  const isExtensionFlow = searchParams.get("extension") === "true";

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (isExtensionFlow) {
          // Send session to extension and show success
          sendSessionToExtension(session);
        } else {
          navigate("/dashboard");
        }
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (isExtensionFlow) {
          sendSessionToExtension(session);
        } else {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isExtensionFlow]);

  // Send session to Chrome extension via postMessage
  const sendSessionToExtension = async (session: any) => {
    try {
      // Try to communicate with extension via BroadcastChannel
      const channel = new BroadcastChannel("smarttab-auth");
      channel.postMessage({
        type: "AUTH_SESSION",
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          user: session.user,
          expires_at: session.expires_at
        }
      });
      channel.close();

      setExtensionConnected(true);
      toast({
        title: "Extension Connected!",
        description: "You can now close this tab and use SmartTab AI.",
      });
    } catch (error) {
      console.error("Failed to send session to extension:", error);
    }
  };

  // Clear errors when mode changes
  useEffect(() => {
    setErrors({});
  }, [mode]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};

    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    // Validate password (not needed for forgot mode)
    if (mode !== "forgot") {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }

    // Validate full name (only for signup)
    if (mode === "signup") {
      const fullNameResult = fullNameSchema.safeParse(fullName);
      if (!fullNameResult.success) {
        newErrors.fullName = fullNameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });

        if (error) throw error;

        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
        setMode("signin");
      } else if (mode === "signup") {
        // Check password against HaveIBeenPwned before signup
        const breachResult = await checkPasswordBreached(password);
        if (breachResult.breached) {
          setPasswordBreached(true);
          const breachCount = breachResult.count?.toLocaleString() || "multiple";
          toast({
            title: "⚠️ Compromised Password Detected",
            description: `This password has appeared in ${breachCount} data breaches. Please choose a different password.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Welcome to SmartTab AI. Redirecting to dashboard...",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "Redirecting to dashboard...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "signup": return "Create an account";
      case "forgot": return "Reset password";
      default: return "Welcome back";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "signup": return "Start organizing your tabs with AI";
      case "forgot": return "Enter your email to receive a reset link";
      default: return "Sign in to access your dashboard";
    }
  };

  // Show extension connected success view
  if (extensionConnected) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-card border-border">
            <CardHeader className="space-y-1 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Extension Connected!
              </CardTitle>
              <CardDescription className="text-base">
                SmartTab AI is now connected to your account. You can close this tab and start using the extension.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Close this browser tab</li>
                  <li>Click the SmartTab AI icon in your toolbar</li>
                  <li>Start organizing your tabs with AI!</li>
                </ol>
              </div>
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="w-full"
              >
                Or go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="shadow-card border-border">
          <CardHeader className="space-y-1 text-center">
            {isExtensionFlow && (
              <div className="mb-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full inline-flex items-center gap-1 mx-auto">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="M14 9l3 3-3 3"/>
                </svg>
                Extension Login
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-gradient-hero flex items-center justify-center mx-auto mb-4">
              {mode === "forgot" ? (
                <Mail className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Brain className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {getTitle()}
            </CardTitle>
            <CardDescription>
              {isExtensionFlow ? "Sign in to connect SmartTab AI extension" : getDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    className={errors.fullName ? "border-destructive" : ""}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordBreached(false);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={errors.password || passwordBreached ? "border-destructive" : ""}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                  {passwordBreached && mode === "signup" && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">
                        This password has been exposed in data breaches. Please choose a stronger, unique password.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                disabled={loading || isChecking}
              >
                {loading || isChecking
                  ? isChecking ? "Checking password security..." : "Loading..."
                  : mode === "signup"
                  ? "Create Account"
                  : mode === "forgot"
                  ? "Send Reset Link"
                  : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm space-y-2">
              {mode === "forgot" ? (
                <button
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              ) : (
                <button
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                  className="text-primary hover:underline"
                >
                  {mode === "signup"
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
