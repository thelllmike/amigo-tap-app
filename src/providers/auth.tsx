import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { IS_CLIP } from '@/lib/clip';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  /** False until the stored session has been restored. */
  ready: boolean;
}

const AuthContext = createContext<AuthValue>({ session: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(IS_CLIP);

  useEffect(() => {
    // The App Clip is a public viewer: it never signs anyone in.
    if (IS_CLIP) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, ready }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signOut() {
  // While still signed in, so the database lets us remove this phone's token.
  await unregisterPush();
  return supabase.auth.signOut();
}
