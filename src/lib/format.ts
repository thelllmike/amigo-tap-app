import { ANALYTICS_TZ } from '@/lib/config';

/** 38400 → "38.4k", 1204 → "1,204" (under 10k stays exact). */
export function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (Math.abs(n) >= 10_000) return `${trim(n / 1000)}k`;
  return n.toLocaleString('en-US');
}

function trim(n: number) {
  return n.toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, '');
}

export function money(n: number, currency = 'LKR') {
  return `${currency} ${Math.round(n).toLocaleString('en-US')}`;
}

/** Percent change from `before` to `now`, or null when there is nothing to compare. */
export function delta(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}

export function minutesSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function ago(iso: string, now = Date.now()) {
  const m = minutesSince(iso, now);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: ANALYTICS_TZ });
}

/** `daysAgo` days before today, as YYYY-MM-DD in the analytics zone. */
export function dayKey(daysAgo = 0, now = new Date()) {
  const d = new Date(now.getTime() - daysAgo * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: ANALYTICS_TZ }).format(d);
}

/** Day key of an ISO timestamp. */
export function dayOf(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ANALYTICS_TZ }).format(new Date(iso));
}

/** Hour 0–23 of an ISO timestamp in the analytics zone. */
export function hourOf(iso: string) {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: ANALYTICS_TZ }).format(new Date(iso))) % 24;
}

/** Single-letter weekday for a day key: "F", "S", … */
export function weekdayLetter(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' });
}

export function greeting(now = new Date()) {
  const h = hourOf(now.toISOString());
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
