import { Redirect } from 'expo-router';

import { Splash } from '@/components/splash';
import { IS_CLIP } from '@/lib/clip';
import { useAuth } from '@/providers/auth';
import { useBusinesses } from '@/providers/business';

/** Sends each launch to the right place: App Clip home, login, or the last business. */
export default function Index() {
  const { session } = useAuth();
  const { current, loading, businesses } = useBusinesses();
  if (IS_CLIP) return <Redirect href="/clip" />;
  if (!session) return <Redirect href="/login" />;
  // Wait for the list so a returning owner lands straight back in their business.
  if (loading) return <Splash />;
  if (current || businesses.length === 1) return <Redirect href={current ? '/home' : '/businesses'} />;
  // No business: a driver using Park Alert.
  if (businesses.length === 0) return <Redirect href="/vehicles" />;
  return <Redirect href="/businesses" />;
}
