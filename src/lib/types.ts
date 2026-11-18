/**
 * The slice of the web app's types/linktree.ts that the owner app reads and
 * writes. Keep field names in step with that file — they are the DB columns.
 */
export type BusinessType = 'linkpage' | 'businesscard' | 'socialtree';

export type PageTemplate = 'classic' | 'bistro' | 'blossom' | 'leaf' | 'chalkboard' | 'coast' | 'arch' | 'campus';

export interface Business {
  id: string;
  user_id?: string;
  name: string;
  slug: string;
  type: BusinessType;
  description: string | null;
  avatar_url: string | null;
  theme_color: string;
  enable_ordering: boolean;
  card_config: { person_name?: string; person_title?: string } | null;
  page_config?: ({ template?: PageTemplate } & Record<string, unknown>) | null;
  /** Appointment booking settings; `enabled` switches the feature on. */
  booking_config?: { enabled?: boolean; slot_minutes?: number; timezone?: string } & Record<string, unknown> | null;
  created_at: string;
}

export interface SocialLink {
  id: string;
  business_id: string;
  platform: string;
  url: string;
  label: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  business_id: string;
  name: string;
  display_order: number;
}

export interface MenuItem {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  is_available: boolean;
  display_order: number;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  display_order: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'ready' | 'completed';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  business_id: string;
  table_id: string | null;
  table_name: string | null;
  customer_name: string | null;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  /** Not in every deployment's schema; shown when present. */
  note?: string | null;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  email?: string | null;
  created_at: string;
}

/** One day's total for one link. `link_id` null means page views. */
export interface LinkStat {
  link_id: string | null;
  day: string;
  count: number;
}

/* ── Appointments (web: types/appointments.ts, supabase/appointments.sql) ── */

export interface TimeRange {
  start: string;
  end: string;
}

export interface Staff {
  id: string;
  business_id: string;
  name: string;
  photo_url: string | null;
  specialization: string | null;
  /** Weekly hours keyed by weekday "0" (Sunday) … "6". */
  schedule: Partial<Record<string, TimeRange[]>>;
  is_active: boolean;
  display_order: number;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  business_id: string;
  staff_id: string | null;
  staff_name: string | null;
  customer_name: string;
  customer_phone: string;
  note: string | null;
  /** YYYY-MM-DD, the business's local date. */
  appt_date: string;
  /** HH:MM:SS, the business's local time. */
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}
