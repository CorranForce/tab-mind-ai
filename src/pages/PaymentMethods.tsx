import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, CreditCard, Trash2, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_live_51J3qRXRbxIeMPlL2q5u6LpxPCOj56OpuZfcF46FUQsh26N5ztBq7SlpjS9ObhElci2M7gZjxLXUo2ZsjKQQlShWY00n1ZDBdPa");

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      "::placeholder": {
        color: "hsl(var(--muted-foreground))",
      },
      backgroundColor: "transparent",
    },
    invalid: {
      color: "hsl(var(--destructive))",
    },
  },
};

interface PaymentMethod {
  id: string;
  card_brand: string | null;
  card_last4: string | null;
  card_exp_month: number | null;
  card_exp_year: number | null;
  is_default: boolean | null;
}

const AddCardForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Get SetupIntent from backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "create-setup-intent",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (setupError || !setupData?.clientSecret) {
        throw new Error(setupError?.message || "Failed to create setup intent");
      }

      // Confirm card setup with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        setupData.clientSecret,
        {
          payment_method: { card: cardElement },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error("No payment method created");
      }

      // Save payment method to database via edge function
      const { error: saveError } = await supabase.functions.invoke(
        "save-payment-method",
        {
          body: { paymentMethodId: setupIntent.payment_method },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (saveError) {
        throw new Error(saveError.message || "Failed to save payment method");
      }

      toast({
        title: "Success",
        description: "Payment method added successfully",
      });

      cardElement.clear();
      onSuccess();
    } catch (err: any) {
      const message = err.message || "An error occurred";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border border-border rounded-md bg-background">
        <CardElement options={cardElementOptions} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          "Add Card"
        )}
      </Button>
    </form>
  );
};

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchPaymentMethods();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Fetch payment methods via edge function (retrieves card details from Stripe API)
      const { data, error } = await supabase.functions.invoke("get-payment-methods", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setPaymentMethods(data?.paymentMethods || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method removed",
      });

      fetchPaymentMethods();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
            <p className="text-muted-foreground">Manage your payment methods and billing information</p>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Payment Method
              </CardTitle>
              <CardDescription>Add a new credit or debit card securely via Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <AddCardForm onSuccess={fetchPaymentMethods} />
              </Elements>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Saved Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : paymentMethods.length === 0 ? (
                <p className="text-muted-foreground">No payment methods saved</p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <CreditCard className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium capitalize">
                            {method.card_brand || "Card"} •••• {method.card_last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {method.card_exp_month}/{method.card_exp_year}
                          </p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently remove this payment method.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCard(method.id)}>
                              Remove
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
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
