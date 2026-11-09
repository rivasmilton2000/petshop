import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '@/types/auth';

const Context = createContext<{ user: SessionUser | null; refresh: () => Promise<void> }>({ user: null, refresh: async () => {} });
export function useAuthSession() { return useContext(Context); }
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const refresh = async () => {
    try { const response = await fetch('/api/auth/session', { cache: 'no-store' }); const data = await response.json(); setUser(response.ok ? data.user : null); }
    catch { setUser(null); }
  };
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  return <Context.Provider value={{ user, refresh }}>{children}</Context.Provider>;
}
