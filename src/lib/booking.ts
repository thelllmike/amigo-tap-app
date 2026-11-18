import { C } from '@/constants/theme';
import type { AppointmentStatus, Business } from '@/lib/types';

/** Mirrors lib/linktree/booking.ts on the web. */

export function bookingEnabled(b: Pick<Business, 'booking_config'> | null | undefined) {
  return !!b?.booking_config?.enabled;
}

/** "14:30:00" → "2:30 PM". */
export function formatTime(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-11-18" → "Wed, 18 Nov". */
export function formatDay(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export const APPT_STATUS: Record<AppointmentStatus, { label: string; tone: 'pending' | 'ready' | 'done' | 'danger' }> = {
  pending: { label: 'New', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'ready' },
  completed: { label: 'Done', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  no_show: { label: 'No-show', tone: 'danger' },
};

export const APPT_COLOR: Record<AppointmentStatus, string> = {
  pending: C.pending,
  confirmed: C.accent,
  completed: C.muted,
  cancelled: C.danger,
  no_show: C.danger,
};

export function isLive(status: AppointmentStatus) {
  return status === 'pending' || status === 'confirmed';
}
