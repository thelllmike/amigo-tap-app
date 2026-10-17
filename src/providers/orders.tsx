import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { fetchOrders, setOrderStatus } from '@/lib/data';
import { isRestaurant } from '@/lib/links';
import { playOrderSound } from '@/lib/sound';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { useBusinesses } from '@/providers/business';

interface OrdersValue {
  orders: Order[];
  loading: boolean;
  /** Orders that arrived while the app was open and haven't been opened yet. */
  unseen: Set<string>;
  markSeen: (id: string) => void;
  /** The order the new-order toast is showing, if any. */
  toast: Order | null;
  dismissToast: () => void;
  advance: (order: Order, status: OrderStatus) => Promise<void>;
  refresh: () => Promise<void>;
}

const OrdersContext = createContext<OrdersValue | null>(null);

/** Poll as a safety net: realtime can drop, or the publication may not include orders. */
const POLL_MS = 10_000;

/** Remounts the live feed per business, so switching starts from a clean slate. */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const { current } = useBusinesses();
  const businessId = current && isRestaurant(current) ? current.id : null;
  return (
    <LiveOrders key={businessId ?? 'none'} businessId={businessId}>
      {children}
    </LiveOrders>
  );
}

function LiveOrders({ businessId, children }: { businessId: string | null; children: ReactNode }) {
  const { prefs } = useBusinesses();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(!!businessId);
  const [unseen, setUnseen] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Order | null>(null);
  const known = useRef<Set<string>>(new Set());
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  const alert = useCallback((order: Order) => {
    setUnseen((s) => new Set(s).add(order.id));
    setToast(order);
    if (prefsRef.current.orderSound) playOrderSound();
    if (prefsRef.current.vibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /** Merge a fetched list; anything pending we've never seen is a new order. */
  const ingest = useCallback(
    (incoming: Order[], first: boolean) => {
      const fresh = incoming.filter((o) => !known.current.has(o.id));
      for (const o of incoming) known.current.add(o.id);
      setOrders(incoming);
      if (!first) for (const o of fresh) if (o.status === 'pending') alert(o);
    },
    [alert],
  );

  const refresh = useCallback(async () => {
    if (!businessId) return;
    try {
      ingest(await fetchOrders(businessId), known.current.size === 0);
    } catch {
      // Keep showing what we have; the next poll retries.
    }
  }, [businessId, ingest]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    fetchOrders(businessId)
      .then((list) => !cancelled && ingest(list, true))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));

    const channel = supabase
      .channel(`owner-orders-${businessId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, (payload) => {
        const order = payload.new as Order;
        if (known.current.has(order.id)) return;
        known.current.add(order.id);
        setOrders((prev) => [order, ...prev]);
        alert(order);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, (payload) => {
        const order = payload.new as Order;
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      })
      .subscribe();

    const timer = setInterval(() => {
      fetchOrders(businessId)
        .then((list) => !cancelled && ingest(list, false))
        .catch(() => {});
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [businessId, ingest, alert]);

  const markSeen = useCallback((id: string) => {
    setUnseen((s) => {
      if (!s.has(id)) return s;
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    setToast((t) => (t?.id === id ? null : t));
  }, []);

  const advance = useCallback(async (order: Order, status: OrderStatus) => {
    const before = order.status;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    try {
      await setOrderStatus(order, status);
    } catch (e) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: before } : o)));
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ orders, loading, unseen, markSeen, toast, dismissToast: () => setToast(null), advance, refresh }),
    [orders, loading, unseen, markSeen, toast, advance, refresh],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside OrdersProvider');
  return ctx;
}

export const STATUS_FLOW: Record<OrderStatus, { label: string; next: OrderStatus | null; action: string | null }> = {
  pending: { label: 'New', next: 'confirmed', action: 'Accept' },
  confirmed: { label: 'Preparing', next: 'ready', action: 'Mark ready' },
  ready: { label: 'Ready', next: 'completed', action: 'Complete' },
  completed: { label: 'Done', next: null, action: null },
};
