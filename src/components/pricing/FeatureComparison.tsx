import { Card } from "@/components/ui/card";

const allFeatures = [
  {
    category: "Tab Management",
    features: [
      { name: "Active tabs limit", free: "10", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "Archive history", free: "7 days", pro: "Unlimited", enterprise: "Unlimited" },
      { name: "Custom tab groups", free: "—", pro: "✓", enterprise: "✓" },
      { name: "Bulk operations", free: "—", pro: "✓", enterprise: "✓" },
    ],
  },
  {
    category: "AI Features",
    features: [
      { name: "AI recommendations", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "Pattern learning", free: "—", pro: "✓", enterprise: "✓" },
      { name: "Context awareness", free: "—", pro: "✓", enterprise: "✓" },
      { name: "Predictive surfacing", free: "—", pro: "✓", enterprise: "✓" },
    ],
  },
  {
    category: "Sync & Access",
    features: [
      { name: "Device sync", free: "1 device", pro: "All devices", enterprise: "All devices" },
      { name: "Cross-browser sync", free: "—", pro: "✓", enterprise: "✓" },
      { name: "Offline access", free: "—", pro: "✓", enterprise: "✓" },
    ],
  },
  {
    category: "Analytics & Insights",
    features: [
      { name: "Usage statistics", free: "Basic", pro: "Advanced", enterprise: "Advanced" },
      { name: "Productivity insights", free: "—", pro: "✓", enterprise: "✓" },
      { name: "Custom reports", free: "—", pro: "—", enterprise: "✓" },
      { name: "Export data", free: "—", pro: "✓", enterprise: "✓" },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Support type", free: "Community", pro: "Priority", enterprise: "Dedicated" },
      { name: "Response time", free: "48h", pro: "24h", enterprise: "4h SLA" },
      { name: "Training", free: "—", pro: "—", enterprise: "Custom" },
    ],
  },
];

export const FeatureComparison = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Compare All Features
        </h2>
        <p className="text-xl text-muted-foreground">
          See what's included in each plan
        </p>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 font-semibold w-1/2">Feature</th>
                <th className="text-center p-4 font-semibold">Free</th>
                <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                <th className="text-center p-4 font-semibold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((category, categoryIndex) => (
                <>
                  <tr key={`category-${categoryIndex}`} className="bg-muted/30">
                    <td colSpan={4} className="p-4 font-semibold text-sm">
                      {category.category}
                    </td>
                  </tr>
                  {category.features.map((feature, featureIndex) => (
                    <tr
                      key={`feature-${categoryIndex}-${featureIndex}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-4 text-sm">{feature.name}</td>
                      <td className="p-4 text-center text-sm text-muted-foreground">
                        {feature.free}
                      </td>
                      <td className="p-4 text-center text-sm font-medium bg-primary/5">
                        {feature.pro}
                      </td>
                      <td className="p-4 text-center text-sm text-muted-foreground">
                        {feature.enterprise}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
