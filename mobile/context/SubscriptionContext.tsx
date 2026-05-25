import * as React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPro, setIsPro] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const sub = await AsyncStorage.getItem('desidiet_subscription');
        const count = await AsyncStorage.getItem('desidiet_chat_count');
        setIsPro(sub === 'pro');
        if (count) {
          setMessageCount(parseInt(count, 10));
        }
      } catch (e) {
        console.error('Failed to load subscription state', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const subscribe = useCallback(async () => {
    try {
      await AsyncStorage.setItem('desidiet_subscription', 'pro');
      setIsPro(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('desidiet_subscription');
      setIsPro(false);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const incrementMessageCount = useCallback(async () => {
    setMessageCount((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem('desidiet_chat_count', String(next));
      return next;
    });
  }, []);

  const resetMessageCount = useCallback(async () => {
    try {
      await AsyncStorage.setItem('desidiet_chat_count', '0');
      setMessageCount(0);
    } catch (e) {
      console.error(e);
    }
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
        isLoading,
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
