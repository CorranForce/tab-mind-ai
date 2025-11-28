import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingCTAProps {
  isAuthenticated: boolean;
}

export const PricingCTA = ({ isAuthenticated }: PricingCTAProps) => {
  return (
    <div className="max-w-4xl mx-auto text-center mt-20 p-12 rounded-3xl bg-gradient-hero shadow-glow">
      <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
        Ready to Get Started?
      </h2>
      <p className="text-xl text-white/90 mb-8">
        Start your 14-day free trial today. No credit card required.
      </p>
      <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
        <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8">
          Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
};
