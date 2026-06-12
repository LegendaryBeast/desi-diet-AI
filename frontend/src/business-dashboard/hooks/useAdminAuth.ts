import { useState, useEffect, useCallback } from 'react';
import { getAdminPassword, setAdminPassword, clearAdminPassword, adminAuth } from '../api';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

export function useAdminAuth(): AdminAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const password = getAdminPassword();
    if (password) {
      // Verify locally (no backend call needed)
      adminAuth(password)
        .then(() => setIsAuthenticated(true))
        .catch(() => { clearAdminPassword(); setIsAuthenticated(false); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await adminAuth(password);
      setAdminPassword(password);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Invalid password');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminPassword();
    setIsAuthenticated(false);
    setError(null);
  }, []);

  return { isAuthenticated, isLoading, error, login, logout };
}
