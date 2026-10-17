import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchLinkStats, fetchMyBusinesses, viewsOn } from '@/lib/data';
import { loadPrefs, savePrefs, type Prefs } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';
import type { Business } from '@/lib/types';
import { useAuth } from '@/providers/auth';

interface BusinessValue {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  /** Page views today, per business id. */
  viewsToday: Record<string, number>;
  /** Orders waiting to be accepted, per business id. */
  pendingCounts: Record<string, number>;
  current: Business | null;
  select: (id: string) => void;
  refresh: () => Promise<void>;
  /** Replace one business after an edit, without a refetch. */
  patch: (b: Business) => void;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
}

const BusinessContext = createContext<BusinessValue | null>(null);

interface Loaded {
  businesses: Business[];
  pendingCounts: Record<string, number>;
  error: string | null;
}

async function loadBusinesses(userId: string): Promise<Loaded> {
  try {
    const businesses = await fetchMyBusinesses(userId);
    const pendingCounts: Record<string, number> = {};
    const ids = businesses.map((b) => b.id);
    if (ids.length) {
      const { data } = await supabase.from('orders').select('business_id').in('business_id', ids).eq('status', 'pending');
      for (const row of (data ?? []) as { business_id: string }[]) pendingCounts[row.business_id] = (pendingCounts[row.business_id] ?? 0) + 1;
    }
    return { businesses, pendingCounts, error: null };
  } catch (e) {
    return { businesses: [], pendingCounts: {}, error: e instanceof Error ? e.message : 'Could not load your businesses' };
  }
}

async function loadViewsToday(businesses: Business[]) {
  const rows = await Promise.all(businesses.map(async (b) => [b.id, viewsOn(await fetchLinkStats(b.id, 2), 0)] as const));
  return Object.fromEntries(rows) as Record<string, number>;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewsToday, setViewsToday] = useState<Record<string, number>>({});
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [prefs, setPrefsState] = useState<Prefs>({ orderSound: true, vibrate: true, lastBusinessId: null });
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    loadPrefs().then((p) => {
      setPrefsState(p);
      setCurrentId((id) => id ?? p.lastBusinessId);
    });
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...p };
      void savePrefs(next);
      return next;
    });
  }, []);

  const apply = useCallback((res: Loaded) => {
    setError(res.error);
    if (!res.error) {
      setBusinesses(res.businesses);
      setPendingCounts(res.pendingCounts);
    }
    setLoading(false);
    // Summary numbers for the picker load after the list, and never block it.
    void loadViewsToday(res.businesses).then(setViewsToday);
  }, []);

  const refresh = useCallback(async () => {
    if (userId) apply(await loadBusinesses(userId));
  }, [userId, apply]);

  // Signing in as someone else remounts this provider (see BusinessRoot), so
  // there is no previous user's state to clear here.
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void loadBusinesses(userId).then((res) => live && apply(res));
    return () => {
      live = false;
    };
  }, [userId, apply]);

  const select = useCallback(
    (id: string) => {
      setCurrentId(id);
      setPrefs({ lastBusinessId: id });
    },
    [setPrefs],
  );

  const patch = useCallback((b: Business) => setBusinesses((list) => list.map((x) => (x.id === b.id ? b : x))), []);

  const current = useMemo(() => businesses.find((b) => b.id === currentId) ?? null, [businesses, currentId]);

  const value = useMemo(
    () => ({ businesses, loading, error, viewsToday, pendingCounts, current, select, refresh, patch, prefs, setPrefs }),
    [businesses, loading, error, viewsToday, pendingCounts, current, select, refresh, patch, prefs, setPrefs],
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

/** Keys the provider by user so a sign-out or account switch starts clean. */
export function BusinessRoot({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return <BusinessProvider key={session?.user.id ?? 'signed-out'}>{children}</BusinessProvider>;
}

export function useBusinesses() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusinesses must be used inside BusinessProvider');
  return ctx;
}

/** The business being managed. Screens under (tabs) only render once one is picked. */
export function useCurrentBusiness() {
  const { current } = useBusinesses();
  if (!current) throw new Error('No business selected');
  return current;
}
