import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const STRIPE_PRODUCTS = {
  pro: {
    price_id: "price_1SxTvLPNua4i0s7ugjHNzsRH",
    product_id: "prod_TvKapBPJXyIQDa",
  },
  enterprise: {
    price_id: "price_1SxTvMPNua4i0s7uI5ks6icg",
    product_id: "prod_TvKakcMbmBDlLQ",
  },
};

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      setSubscription({
        subscribed: data.subscribed,
        productId: data.product_id,
        subscriptionEnd: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const createCheckout = async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const openCustomerPortal = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const isPro = subscription.subscribed && subscription.productId === STRIPE_PRODUCTS.pro.product_id;
  const isEnterprise = subscription.subscribed && subscription.productId === STRIPE_PRODUCTS.enterprise.product_id;

  return {
    ...subscription,
    isPro,
    isEnterprise,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
