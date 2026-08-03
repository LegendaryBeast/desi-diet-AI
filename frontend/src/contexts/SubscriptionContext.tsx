import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const FREE_MESSAGE_LIMIT = 3;

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'premium';

interface PlanConfig {
  aiTokenQuota: number;
  maxSavedMeals: number;
  maxFamilyMembers: number;
}

const PLAN_CONFIGS: Record<SubscriptionTier, PlanConfig> = {
  free: { aiTokenQuota: 1000, maxSavedMeals: 3, maxFamilyMembers: 1 },
  basic: { aiTokenQuota: 10000, maxSavedMeals: 20, maxFamilyMembers: 1 },   // ৳99 — limited
  pro: { aiTokenQuota: 100000, maxSavedMeals: 999, maxFamilyMembers: 1 },    // ৳399 — 1 member unlimited
  premium: { aiTokenQuota: 500000, maxSavedMeals: 999, maxFamilyMembers: 5 }, // ৳999 — 5 members unlimited
};

interface SubscriptionContextValue {
  isPro: boolean;
  tier: SubscriptionTier;
  subscribe: (tier?: SubscriptionTier) => void;
  unsubscribe: () => void;
  messageCount: number;
  incrementMessageCount: () => void;
  resetMessageCount: () => void;
  canSendMessage: boolean;
  FREE_MESSAGE_LIMIT: number;
  tokenQuota: number;
  tokensUsed: number;
  incrementTokensUsed: (count: number) => void;
  planConfig: PlanConfig;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<SubscriptionTier>(() => {
    const saved = localStorage.getItem('desidiet_subscription_tier');
    if (saved && ['free', 'basic', 'pro', 'premium'].includes(saved)) return saved as SubscriptionTier;
    // Legacy fallback
    return localStorage.getItem('desidiet_subscription') === 'pro' ? 'pro' : 'free';
  });

  const [messageCount, setMessageCount] = useState(() => {
    const saved = localStorage.getItem('desidiet_chat_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [tokensUsed, setTokensUsed] = useState(() => {
    const saved = localStorage.getItem('desidiet_tokens_used');
    return saved ? parseInt(saved, 10) : 0;
  });

  const isPro = tier !== 'free';
  const planConfig = PLAN_CONFIGS[tier];

  useEffect(() => {
    localStorage.setItem('desidiet_chat_count', String(messageCount));
  }, [messageCount]);

  useEffect(() => {
    localStorage.setItem('desidiet_tokens_used', String(tokensUsed));
  }, [tokensUsed]);

  useEffect(() => {
    localStorage.setItem('desidiet_subscription_tier', tier);
    // Legacy sync
    if (tier === 'pro' || tier === 'premium') {
      localStorage.setItem('desidiet_subscription', 'pro');
    } else {
      localStorage.removeItem('desidiet_subscription');
    }
  }, [tier]);

  const subscribe = useCallback((newTier: SubscriptionTier = 'pro') => {
    localStorage.setItem('desidiet_subscription_tier', newTier);
    setTier(newTier);
  }, []);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem('desidiet_subscription_tier');
    localStorage.removeItem('desidiet_subscription');
    setTier('free');
  }, []);

  const incrementMessageCount = useCallback(() => {
    setMessageCount((prev) => prev + 1);
  }, []);

  const resetMessageCount = useCallback(() => {
    setMessageCount(0);
    localStorage.setItem('desidiet_chat_count', '0');
  }, []);

  const incrementTokensUsed = useCallback((count: number) => {
    setTokensUsed((prev) => prev + count);
  }, []);

  // Free tier: 3 messages limit. Paid tiers: unlimited messages but token quota applies
  const canSendMessage = isPro || messageCount < FREE_MESSAGE_LIMIT;

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        tier,
        subscribe,
        unsubscribe,
        messageCount,
        incrementMessageCount,
        resetMessageCount,
        canSendMessage,
        FREE_MESSAGE_LIMIT,
        tokenQuota: planConfig.aiTokenQuota,
        tokensUsed,
        incrementTokensUsed,
        planConfig,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
};
