import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PLATFORM_OWNER_EMAIL = "corranforce@gmail.com";

export const usePlatformOwner = () => {
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlatformOwner = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsPlatformOwner(false);
          setLoading(false);
          return;
        }

        // Platform Owner is specifically corranforce@gmail.com
        setIsPlatformOwner(user.email === PLATFORM_OWNER_EMAIL);
      } catch (error) {
        console.error("Error checking platform owner:", error);
        setIsPlatformOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkPlatformOwner();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPlatformOwner();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isPlatformOwner, loading };
};
