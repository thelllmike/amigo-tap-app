import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchInbox, fetchVehicles } from '@/lib/data';
import { notifications, registerPush, type PushState } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { InboxRow, Vehicle } from '@/lib/types';
import { useAuth } from '@/providers/auth';

interface ParkValue {
  vehicles: Vehicle[];
  inbox: InboxRow[];
  unread: number;
  loading: boolean;
  push: PushState;
  refresh: () => Promise<void>;
  /** Asks for notification permission (from a button) and registers the phone. */
  enablePush: () => Promise<PushState>;
  setVehicles: (fn: (v: Vehicle[]) => Vehicle[]) => void;
}

const ParkContext = createContext<ParkValue | null>(null);

function openChatFrom(data: unknown) {
  const d = data as { type?: string; chat_id?: string } | undefined;
  if (d?.type === 'vehicle_chat' && d.chat_id) router.push(`/vehicle-chat/${d.chat_id}`);
}

/** The signed-in user's vehicles and Park Alert inbox, kept live. */
function ParkProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [push, setPush] = useState<PushState>('undetermined');
  const asked = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [v, i] = await Promise.all([fetchVehicles(userId), fetchInbox(userId)]);
      setVehicles(v);
      setInbox(i);
    } catch {
      // Tables missing (SQL not run yet) or offline: show nothing rather than an error.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    const channel = supabase
      .channel(`park-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_messages', filter: `owner_id=eq.${userId}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_chats', filter: `owner_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => {
      sub.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  // Register this phone for pushes once the owner has a vehicle. The system
  // prompt is only shown the first time; after that we just refresh the token.
  useEffect(() => {
    if (!userId || loading || !vehicles.length || asked.current) return;
    asked.current = true;
    void registerPush(true).then(setPush);
  }, [userId, loading, vehicles.length]);

  // Tapping a notification opens its chat, including from a cold start.
  useEffect(() => {
    const N = notifications();
    if (!N || !userId) return;
    void N.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        // Give the navigator a moment to mount on a cold start.
        setTimeout(() => openChatFrom(r.notification.request.content.data), 800);
        void N.clearLastNotificationResponseAsync();
      }
    });
    const sub = N.addNotificationResponseReceivedListener((r) => openChatFrom(r.notification.request.content.data));
    return () => sub.remove();
  }, [userId]);

  const enablePush = useCallback(async () => {
    const s = await registerPush(true);
    setPush(s);
    return s;
  }, []);

  const unread = inbox.filter((r) => r.unread).length;

  const value = useMemo(
    () => ({ vehicles, inbox, unread, loading, push, refresh, enablePush, setVehicles }),
    [vehicles, inbox, unread, loading, push, refresh, enablePush],
  );
  return <ParkContext.Provider value={value}>{children}</ParkContext.Provider>;
}

/** Keyed by user so switching accounts starts clean. Does nothing while signed out. */
export function ParkRoot({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return <ParkProvider key={session?.user.id ?? 'signed-out'}>{children}</ParkProvider>;
}

export function usePark() {
  const ctx = useContext(ParkContext);
  if (!ctx) throw new Error('usePark must be used inside ParkRoot');
  return ctx;
}
