import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { IS_CLIP } from '@/lib/clip';
import { filePathsFor, removeFiles } from '@/lib/data';
import { unregisterPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';

interface AuthValue {
  session: Session | null;
  /** False until the stored session has been restored. */
  ready: boolean;
  /** Superadmins alone may create or delete pages, vehicles and pets. */
  isSuperadmin: boolean;
}

const AuthContext = createContext<AuthValue>({ session: null, ready: false, isSuperadmin: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(IS_CLIP);
  // Keyed by user, so a stale answer for someone else never applies.
  const [role, setRole] = useState<{ uid: string; admin: boolean } | null>(null);
  const uid = session?.user.id;

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

  useEffect(() => {
    if (!uid) return;
    void supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle()
      .then(({ data }) => setRole({ uid, admin: data?.role === 'superadmin' }));
  }, [uid]);

  const isSuperadmin = !!uid && role?.uid === uid && role.admin;

  return <AuthContext.Provider value={{ session, ready, isSuperadmin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signOut() {
  // While still signed in, so the database lets us remove this phone's token.
  await unregisterPush();
  return supabase.auth.signOut();
}

/**
 * Permanently deletes the signed-in account: its uploaded images, every
 * business it owns (and all their data), its vehicles and messages, and the
 * login itself. Required in-app by both the App Store and Google Play.
 * Database side: supabase/delete-account.sql in the web repo.
 */
export async function deleteAccount() {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error('You’re not signed in.');

  // Every image and document this user uploaded, from the app or the web.
  // Listed before the delete, removed after it, so a failed delete never
  // leaves pages with broken images. The access token stays valid for the
  // removal even though the user row is gone.
  const files = await filePathsFor('my_file_paths');

  await unregisterPush();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);

  await removeFiles(files);

  // The user no longer exists on the server, so only clear this phone's session.
  await supabase.auth.signOut({ scope: 'local' });
}
