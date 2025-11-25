import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, CreditCard, Trash2, Plus, ArrowLeft } from "lucide-react";
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

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
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
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCard(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const last4 = cardNumber.slice(-4);
      const brand = detectCardBrand(cardNumber);

      const { error } = await supabase.from("payment_methods").insert({
        user_id: user.id,
        card_last4: last4,
        card_brand: brand,
        card_exp_month: parseInt(expMonth),
        card_exp_year: parseInt(expYear),
        is_default: paymentMethods.length === 0,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment method added successfully",
      });

      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      fetchPaymentMethods();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingCard(false);
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

  const detectCardBrand = (number: string) => {
    if (number.startsWith("4")) return "Visa";
    if (number.startsWith("5")) return "Mastercard";
    if (number.startsWith("3")) return "Amex";
    return "Unknown";
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
              <CardDescription>Add a new credit or debit card</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ""))}
                    maxLength={16}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expMonth">Exp. Month</Label>
                    <Input
                      id="expMonth"
                      type="text"
                      placeholder="MM"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expYear">Exp. Year</Label>
                    <Input
                      id="expYear"
                      type="text"
                      placeholder="YYYY"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={addingCard} className="w-full">
                  {addingCard ? "Adding..." : "Add Card"}
                </Button>
              </form>
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
                <p className="text-muted-foreground">Loading...</p>
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
                          <p className="font-medium">
                            {method.card_brand} •••• {method.card_last4}
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
