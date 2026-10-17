/**
 * The app talks to the linktree Supabase project — the one behind
 * amigotap.com/linktree — not the storefront project. The anon key is public by
 * design; row-level security decides what each signed-in owner can touch.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Public origin of the link pages. */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://amigotap.com').replace(/\/$/, '');

/** Query marker the web reads to show its "you tapped" welcome popup. Mirrors lib/linktree/tap.ts. */
export const TAP_SOURCE = 'nfc';

/** Storage bucket the web editor uploads logos and menu photos to. */
export const ASSET_BUCKET = 'business-assets';

/** Day buckets for stats are cut in this zone, matching the web dashboard. */
export const ANALYTICS_TZ = 'Asia/Colombo';
