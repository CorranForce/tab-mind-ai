import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TrialCountdownProps {
  trialEndsAt: string;
}

export const TrialCountdown = ({ trialEndsAt }: TrialCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(trialEndsAt);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trialEndsAt]);

  const isExpired = timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0;

  if (isExpired) {
    return (
      <Card className="shadow-card border-destructive/50 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Trial Expired</p>
              <p className="text-sm text-muted-foreground">Upgrade to continue using SmartTab AI</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-amber-500/50 bg-amber-500/5">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-400">Trial Ending Soon</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m</span> remaining
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
