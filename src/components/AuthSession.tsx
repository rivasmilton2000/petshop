import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import type { SessionUser } from '@/types/auth';

const Context = createContext<{ user: SessionUser | null; ready: boolean; refresh: () => Promise<void>; logout: () => Promise<void> }>({ user: null, ready: false, refresh: async () => {}, logout: async () => {} });
export function useAuthSession() { return useContext(Context); }
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const sequence = useRef(0);
  const router = useRouter();
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try { const response = await fetch('/api/auth/session', { cache: 'no-store' }); const data = await response.json(); if (current === sequence.current) setUser(response.ok ? data.user : null); }
    catch { if (current === sequence.current) setUser(null); }
    finally { if (current === sequence.current) setReady(true); }
  }, []);
  const logout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('No pudimos cerrar la sesión. Inténtalo de nuevo.');
    ++sequence.current; setUser(null); setReady(true);
    try { localStorage.setItem('petshop_session_changed', String(Date.now())); } catch { /* Session cookie remains authoritative. */ }
  };
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    const onStorage = (event: StorageEvent) => { if (event.key === 'petshop_session_changed') void refresh(); };
    window.addEventListener('storage', onStorage);
    router.events.on('routeChangeComplete', onFocus);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onStorage); router.events.off('routeChangeComplete', onFocus); };
  }, [refresh, router.events]);
  return <Context.Provider value={{ user, ready, refresh, logout }}>{children}</Context.Provider>;
}
