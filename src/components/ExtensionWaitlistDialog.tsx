import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Mail, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExtensionWaitlistDialogProps {
  children: React.ReactNode;
}

export function ExtensionWaitlistDialog({ children }: ExtensionWaitlistDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("extension_waitlist")
        .insert({
          email: email.trim(),
          user_id: user?.id || null,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already on waitlist",
            description: "This email is already registered for the waitlist.",
          });
          setJoined(true);
        } else {
          throw error;
        }
      } else {
        // Send confirmation email
        supabase.functions
          .invoke("send-waitlist-confirmation", {
            body: { email: email.trim() },
          })
          .catch((err) => console.error("Failed to send confirmation email:", err));

        toast({
          title: "You're on the list!",
          description: "We'll notify you when the extension launches. Check your email for confirmation.",
        });
        setJoined(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to join waitlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Browser Extension Coming Soon
          </DialogTitle>
          <DialogDescription>
            Be the first to know when our browser extension launches. Get smart tab recommendations powered by AI, directly in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {joined ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">You're on the waitlist!</p>
                <p className="text-sm text-muted-foreground">
                  We'll send you an email when the extension is ready.
                </p>
              </div>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                No spam, just one email when we launch.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
