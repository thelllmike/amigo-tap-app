import { SITE_URL, TAP_SOURCE } from '@/lib/config';
import type { Business } from '@/lib/types';

/** The page link a QR code holds, e.g. https://amigotap.com/linktree/kopi-kade. */
export function pageUrl(slug: string) {
  return `${SITE_URL}/linktree/${slug}`;
}

/** What goes on an NFC tag (or out of a phone): opens the page with the tap welcome popup. */
export function nfcUrl(slug: string) {
  return `${pageUrl(slug)}?src=${TAP_SOURCE}`;
}

/** Ordering page for one table. */
export function tableUrl(slug: string, tableSlug: string) {
  return `${SITE_URL}/linktree/order/${slug}/${tableSlug}`;
}

/** "amigotap.com/linktree/kopi-kade" — the link without its scheme, for display. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '');
}

/**
 * The slug of an AmigoTap page link read from a tag or another phone, or null
 * when the link points somewhere else.
 */
export function slugFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const site = new URL(SITE_URL);
    if (url.hostname.replace(/^www\./, '') !== site.hostname.replace(/^www\./, '')) return null;
    const match = url.pathname.match(/^\/linktree\/([a-z0-9-]+)\/?$/i);
    return match && match[1] !== 'admin' && match[1] !== 'login' ? match[1] : null;
  } catch {
    return null;
  }
}

export const KIND_LABEL: Record<string, string> = {
  restaurant: 'Restaurant',
  linkpage: 'Link page',
  businesscard: 'Business card',
  socialtree: 'Social tree',
};

/** Restaurants are link pages that take table orders. */
export function businessKind(b: Pick<Business, 'type' | 'enable_ordering'>) {
  return b.type === 'linkpage' && b.enable_ordering ? 'restaurant' : b.type;
}

export function isRestaurant(b: Pick<Business, 'type' | 'enable_ordering'> | null | undefined) {
  return !!b && businessKind(b) === 'restaurant';
}

export function initials(name: string) {
  const words = name.replace(/[·|,-]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
