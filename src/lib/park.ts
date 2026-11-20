import { SITE_URL } from '@/lib/config';
import type { ChatReason, VehicleChat, VehicleKind } from '@/lib/types';

/** Mirrors lib/linktree/vehicles.ts on the web. */

export const REASON_LABEL: Record<ChatReason, string> = {
  blocking: 'Blocking someone',
  lights: 'Lights on',
  window: 'Window / door open',
  alarm: 'Alarm going off',
  towing: 'About to be towed',
  damage: 'Something happened',
  other: 'Message',
};

export const QUICK_REPLIES = ['Coming now 🏃', 'Be there in 2 minutes', 'Be there in 5 minutes', 'Moved it, sorry! 🙏', 'Thanks for letting me know!'];

export const VEHICLE_KINDS: { value: VehicleKind; label: string }[] = [
  { value: 'car', label: 'Car' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'bike', label: 'Bike' },
  { value: 'tuk', label: 'Three-wheeler' },
  { value: 'lorry', label: 'Lorry' },
  { value: 'other', label: 'Other' },
];

export const MESSAGE_MAX = 300;

export function chatState(c: Pick<VehicleChat, 'status' | 'blocked' | 'created_at'>, now = Date.now()): 'open' | 'moved' | 'closed' {
  if (c.status === 'moved') return 'moved';
  if (c.status === 'closed' || c.blocked) return 'closed';
  return now - new Date(c.created_at).getTime() > 24 * 3600_000 ? 'closed' : 'open';
}

export function maskPlate(p: string) {
  if (p.length <= 5) return p.slice(0, 2) + '••';
  return p.slice(0, 3) + p.slice(3, -2).replace(/[A-Za-z0-9]/g, '•') + p.slice(-2);
}

export function vehicleTitle(v: { nickname: string | null; plate: string }) {
  return v.nickname?.trim() || v.plate;
}

export function vehicleDescription(v: { color: string | null; make: string | null; model: string | null }) {
  return [v.color, v.make, v.model].filter(Boolean).join(' ');
}

export function scanUrl(code: string) {
  return `${SITE_URL}/v/${code}`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} d`;
}

export function clockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function isMuted(v: { muted_until: string | null }, now = Date.now()) {
  return !!v.muted_until && new Date(v.muted_until).getTime() > now;
}
