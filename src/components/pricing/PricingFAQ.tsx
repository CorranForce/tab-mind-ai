import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PricingFAQ = () => {
  const faqs = [
    {
      question: "Can I change plans later?",
      answer:
        "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, Mastercard, American Express) and support annual billing for additional savings.",
    },
    {
      question: "Is there a contract or can I cancel anytime?",
      answer:
        "No contracts required. You can cancel your subscription at any time, and you'll continue to have access until the end of your billing period.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <Card key={index} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{faq.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
