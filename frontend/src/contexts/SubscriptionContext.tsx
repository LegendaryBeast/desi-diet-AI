import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const FREE_MESSAGE_LIMIT = 3;

interface SubscriptionContextValue {
  isPro: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  messageCount: number;
  incrementMessageCount: () => void;
  resetMessageCount: () => void;
  canSendMessage: boolean;
  FREE_MESSAGE_LIMIT: number;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(() => {
    return localStorage.getItem('desidiet_subscription') === 'pro';
  });

  const [messageCount, setMessageCount] = useState(() => {
    const saved = localStorage.getItem('desidiet_chat_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('desidiet_chat_count', String(messageCount));
  }, [messageCount]);

  const subscribe = useCallback(() => {
    localStorage.setItem('desidiet_subscription', 'pro');
    setIsPro(true);
  }, []);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem('desidiet_subscription');
    setIsPro(false);
  }, []);

  const incrementMessageCount = useCallback(() => {
    setMessageCount((prev) => prev + 1);
  }, []);

  const resetMessageCount = useCallback(() => {
    setMessageCount(0);
    localStorage.setItem('desidiet_chat_count', '0');
  }, []);

  const canSendMessage = isPro || messageCount < FREE_MESSAGE_LIMIT;

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        subscribe,
        unsubscribe,
        messageCount,
        incrementMessageCount,
        resetMessageCount,
        canSendMessage,
        FREE_MESSAGE_LIMIT,
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
