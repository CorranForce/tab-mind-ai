import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Bug, HelpCircle, MessageSquare, Send, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Support = () => {
  const [issueType, setIssueType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Pre-fill email if user is logged in
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    loadUserEmail();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType || !subject || !description) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please provide your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get current user - authentication is required
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit a support ticket.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Insert support ticket into database
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          email: email,
          issue_type: issueType,
          subject,
          description,
          status: 'open',
        });
      
      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Ticket Submitted",
        description: "We've received your support request and will respond soon.",
      });
    } catch (error: any) {
      console.error("Error submitting support ticket:", error);
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">SmartTab AI</span>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto shadow-card">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Request Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for reaching out. Our team will review your request and get back to you within 24-48 hours.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => {
                  setSubmitted(false);
                  setIssueType("");
                  setSubject("");
                  setDescription("");
                }}>
                  Submit Another
                </Button>
                <Link to="/dashboard">
                  <Button>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">SmartTab AI</span>
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
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Support Center
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              How Can We Help?
            </h1>
            <p className="text-muted-foreground">
              Submit a bug report, request help, or share feedback
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="shadow-card hover:shadow-glow transition-all cursor-pointer" onClick={() => setIssueType("bug")}>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  <Bug className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold mb-1">Report a Bug</h3>
                <p className="text-sm text-muted-foreground">Something not working right?</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-all cursor-pointer" onClick={() => setIssueType("help")}>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <HelpCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Get Help</h3>
                <p className="text-sm text-muted-foreground">Need assistance?</p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-all cursor-pointer" onClick={() => setIssueType("feedback")}>
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-1">Share Feedback</h3>
                <p className="text-sm text-muted-foreground">Ideas or suggestions?</p>
              </CardContent>
            </Card>
          </div>

          {/* Support Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Submit a Request</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Type *</label>
                  <Select value={issueType} onValueChange={setIssueType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">
                        <span className="flex items-center gap-2">
                          <Bug className="w-4 h-4" />
                          Bug Report
                        </span>
                      </SelectItem>
                      <SelectItem value="help">
                        <span className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4" />
                          Help Request
                        </span>
                      </SelectItem>
                      <SelectItem value="feedback">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Feedback / Suggestion
                        </span>
                      </SelectItem>
                      <SelectItem value="billing">
                        <span className="flex items-center gap-2">
                          💳 Billing Issue
                        </span>
                      </SelectItem>
                      <SelectItem value="other">
                        <span className="flex items-center gap-2">
                          📋 Other
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Email *</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to respond to your request
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    placeholder="Brief summary of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    placeholder="Please provide as much detail as possible. For bugs, include steps to reproduce the issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Support;
