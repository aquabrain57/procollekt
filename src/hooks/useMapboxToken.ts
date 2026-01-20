import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'youcollect.mapbox_token';

export function isLikelyMapboxPublicToken(token: string) {
  return typeof token === 'string' && token.trim().startsWith('pk.');
}

export function useMapboxToken() {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const envToken = (import.meta as any)?.env?.VITE_MAPBOX_TOKEN as string | undefined;
    if (envToken && envToken !== 'undefined' && isLikelyMapboxPublicToken(envToken)) {
      setTokenState(envToken.trim());
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isLikelyMapboxPublicToken(saved)) {
      setTokenState(saved);
      return;
    }
    setTokenState(null);
  }, []);

  const setToken = useCallback((next: string) => {
    const cleaned = next.trim();
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY);
      setTokenState(null);
      return;
    }
    localStorage.setItem(STORAGE_KEY, cleaned);
    setTokenState(cleaned);
  }, []);

  return { token, setToken };
}
