import { decode as decodeBase64 } from 'base64-arraybuffer';

import { ANALYTICS_TZ, ASSET_BUCKET } from '@/lib/config';
import { dayKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type {
  Appointment,
  AppointmentStatus,
  Business,
  BusinessMember,
  InboxRow,
  LinkStat,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  RestaurantTable,
  SocialLink,
  Staff,
  Vehicle,
  VehicleChat,
  VehicleMessage,
} from '@/lib/types';

/**
 * Every query the owner app makes. They run as the signed-in user, so the
 * linktree project's row-level security decides access — the same rules the
 * web dashboard's server actions run under.
 */

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Businesses this user owns or was added to as a manager/editor. */
export async function fetchMyBusinesses(userId: string): Promise<Business[]> {
  const [owned, memberRows] = await Promise.all([
    supabase.from('businesses').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('business_members').select('business_id').eq('user_id', userId),
  ]);
  const mine = must(owned) as Business[];
  const memberIds = (must(memberRows) as { business_id: string }[]).map((m) => m.business_id).filter((id) => !mine.some((b) => b.id === id));
  if (memberIds.length === 0) return mine;
  const shared = must(await supabase.from('businesses').select('*').in('id', memberIds)) as Business[];
  return [...mine, ...shared];
}

export async function fetchBusinessBySlug(slug: string) {
  const { data, error } = await supabase.from('businesses').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Business | null;
}

export async function updateBusiness(id: string, patch: Partial<Business>) {
  must(await supabase.from('businesses').update(patch).eq('id', id).select('id'));
}

export async function slugTaken(slug: string, exceptId: string) {
  const { data } = await supabase.from('businesses').select('id').eq('slug', slug).neq('id', exceptId).maybeSingle();
  return !!data;
}

/* ── Analytics ── */

/** Daily totals per link for the last `days` days (link_id null = page views). */
export async function fetchLinkStats(businessId: string, days = 35): Promise<LinkStat[]> {
  const { data, error } = await supabase.rpc('link_event_stats', { p_business: businessId, p_days: days, p_tz: ANALYTICS_TZ });
  if (error) return []; // Analytics are optional: never block a screen on them.
  return (data as LinkStat[]) ?? [];
}

export function viewsOn(stats: LinkStat[], daysAgo: number) {
  const key = dayKey(daysAgo);
  return stats.filter((s) => s.link_id === null && s.day === key).reduce((n, s) => n + s.count, 0);
}

export function clicksOn(stats: LinkStat[], daysAgo: number) {
  const key = dayKey(daysAgo);
  return stats.filter((s) => s.link_id !== null && s.day === key).reduce((n, s) => n + s.count, 0);
}

/** Per-day series for the last `days` days, oldest first. */
export function series(stats: LinkStat[], days: number, pick: (s: LinkStat) => boolean) {
  return Array.from({ length: days }, (_, i) => {
    const key = dayKey(days - 1 - i);
    return { key, value: stats.filter((s) => s.day === key && pick(s)).reduce((n, s) => n + s.count, 0) };
  });
}

/* ── Orders ── */

export async function fetchOrders(businessId: string, sinceDays = 62): Promise<Order[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
  const res = await supabase
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1000);
  return must(res) as Order[];
}

export async function setOrderStatus(order: Pick<Order, 'id' | 'business_id'>, status: OrderStatus) {
  must(await supabase.from('orders').update({ status }).eq('id', order.id).eq('business_id', order.business_id).select('id'));
}

/* ── Appointments ── */

/** Bookings from `fromDate` (YYYY-MM-DD) on, soonest first. */
export async function fetchAppointments(businessId: string, fromDate: string): Promise<Appointment[]> {
  const res = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', businessId)
    .gte('appt_date', fromDate)
    .order('appt_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(1000);
  return must(res) as Appointment[];
}

export async function setAppointmentStatus(appt: Pick<Appointment, 'id' | 'business_id'>, status: AppointmentStatus) {
  const res = await supabase.from('appointments').update({ status }).eq('id', appt.id).eq('business_id', appt.business_id).select('id');
  if (res.error?.code === '23505') throw new Error('That time has been booked again since it was cancelled.');
  must(res);
}

export async function fetchStaff(businessId: string): Promise<Staff[]> {
  return must(await supabase.from('staff').select('*').eq('business_id', businessId).order('display_order')) as Staff[];
}

/** "On leave" switch: hides the person from the booking page. */
export async function setStaffActive(id: string, isActive: boolean) {
  must(await supabase.from('staff').update({ is_active: isActive }).eq('id', id).select('id'));
}

/* ── Links ── */

export async function fetchLinks(businessId: string): Promise<SocialLink[]> {
  return must(await supabase.from('social_links').select('*').eq('business_id', businessId).order('display_order')) as SocialLink[];
}

export async function addLink(businessId: string, link: { platform: string; url: string; label: string | null }) {
  const { data: last } = await supabase
    .from('social_links')
    .select('display_order')
    .eq('business_id', businessId)
    .order('display_order', { ascending: false })
    .limit(1);
  const display_order = last && last.length ? (last[0] as { display_order: number }).display_order + 1 : 0;
  must(await supabase.from('social_links').insert({ business_id: businessId, ...link, display_order }).select('id'));
}

export async function setLinkActive(id: string, isActive: boolean) {
  must(await supabase.from('social_links').update({ is_active: isActive }).eq('id', id).select('id'));
}

export async function deleteLink(id: string) {
  must(await supabase.from('social_links').delete().eq('id', id).select('id'));
}

export async function reorderLinks(orderedIds: string[]) {
  const results = await Promise.all(orderedIds.map((id, i) => supabase.from('social_links').update({ display_order: i }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/* ── Menu ── */

export async function fetchMenu(businessId: string) {
  const [cats, items, tables] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('business_id', businessId).order('display_order'),
    supabase.from('menu_items').select('*').eq('business_id', businessId).order('display_order'),
    supabase.from('restaurant_tables').select('*').eq('business_id', businessId).order('display_order'),
  ]);
  return {
    categories: must(cats) as MenuCategory[],
    items: must(items) as MenuItem[],
    tables: must(tables) as RestaurantTable[],
  };
}

export type MenuItemInput = Pick<MenuItem, 'name' | 'description' | 'price' | 'category_id' | 'image_url' | 'is_available'>;

export async function saveMenuItem(businessId: string, id: string | null, input: MenuItemInput) {
  if (id) {
    must(await supabase.from('menu_items').update(input).eq('id', id).eq('business_id', businessId).select('id'));
    return;
  }
  const { data: last } = await supabase
    .from('menu_items')
    .select('display_order')
    .eq('business_id', businessId)
    .order('display_order', { ascending: false })
    .limit(1);
  const display_order = last && last.length ? (last[0] as { display_order: number }).display_order + 1 : 0;
  must(await supabase.from('menu_items').insert({ business_id: businessId, currency: 'LKR', display_order, ...input }).select('id'));
}

export async function setItemAvailable(id: string, isAvailable: boolean) {
  must(await supabase.from('menu_items').update({ is_available: isAvailable }).eq('id', id).select('id'));
}

export async function deleteMenuItem(id: string) {
  must(await supabase.from('menu_items').delete().eq('id', id).select('id'));
}

/* ── Team ── */

export async function fetchMembers(businessId: string): Promise<BusinessMember[]> {
  return must(await supabase.from('business_members').select('*').eq('business_id', businessId).order('created_at')) as BusinessMember[];
}

/** Same flow as the web's assignManager: the person must already have an account. */
export async function inviteMember(businessId: string, email: string) {
  const cleaned = email.trim().toLowerCase();
  const { data: targetId, error } = await supabase.rpc('get_user_id_by_email', { p_email: cleaned });
  if (error) throw new Error(error.message);
  if (!targetId) throw new Error('No account with that email — ask them to sign up at amigotap.com first.');
  const res = await supabase.from('business_members').insert({ business_id: businessId, user_id: targetId, email: cleaned, role: 'manager' });
  if (res.error) throw new Error(res.error.code === '23505' ? 'That person already has access here.' : res.error.message);
}

/* ── Deleting ── */

/**
 * Storage paths an item's rows point at (supabase/delete-with-images.sql in the
 * web repo). Read them BEFORE deleting the row; afterwards they're gone.
 */
export async function filePathsFor(fn: 'vehicle_file_paths' | 'my_file_paths', args?: Record<string, string>) {
  const { data, error } = await supabase.rpc(fn, args);
  return error ? [] : ((data as string[] | null) ?? []);
}

/** Best effort: a leftover file must never make a successful delete look failed. */
export async function removeFiles(paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from(ASSET_BUCKET).remove(paths.slice(i, i + 100)).catch(() => {});
  }
}

/** Deletes a page (link page, business card or social tree) the user owns, with all its data and images. */
export async function deleteBusiness(id: string) {
  // One transaction in the database (supabase/delete-with-images.sql); returns the files to remove.
  const { data: files, error } = await supabase.rpc('delete_business', { p_business: id });
  if (error) throw new Error(error.message);
  await removeFiles((files as string[] | null) ?? []);
}

/* ── Uploads ── */

/** Uploads a picked image to the same bucket and folder layout the web editor uses. */
export async function uploadImage(prefix: 'avatars' | 'menu' | 'vehicles', userId: string, base64: string, mime = 'image/jpeg') {
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${prefix}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(ASSET_BUCKET).upload(path, decodeBase64(base64), { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ── Park Alert ── */

export async function fetchVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehicle[];
}

export type VehicleInput = Pick<Vehicle, 'plate' | 'nickname' | 'kind' | 'make' | 'model' | 'color' | 'photo_url' | 'show_full_plate' | 'is_active'>;

export async function saveVehicle(userId: string, id: string | null, input: VehicleInput): Promise<Vehicle> {
  const row = { ...input, plate: input.plate.trim().toUpperCase().replace(/\s+/g, ' ') };
  const res = id
    ? await supabase.from('vehicles').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    : await supabase.from('vehicles').insert({ ...row, user_id: userId }).select('*').single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Vehicle;
}

export async function muteVehicle(id: string, minutes: number | null) {
  const until = minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
  const { error } = await supabase.from('vehicles').update({ muted_until: until }).eq('id', id);
  if (error) throw new Error(error.message);
  return until;
}

export async function deleteVehicle(id: string) {
  const files = await filePathsFor('vehicle_file_paths', { p_vehicle: id });
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await removeFiles(files);
}

/** The owner's chats, newest first, with each chat's latest message. */
export async function fetchInbox(userId: string, limit = 50): Promise<InboxRow[]> {
  const { data: chats, error } = await supabase
    .from('vehicle_chats')
    .select('*, vehicles(id, plate, nickname, kind, photo_url)')
    .eq('owner_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (chats ?? []) as (VehicleChat & { vehicles: InboxRow['vehicle'] })[];
  if (!rows.length) return [];

  const { data: msgs } = await supabase
    .from('vehicle_messages')
    .select('chat_id, sender, body, created_at')
    .in('chat_id', rows.map((c) => c.id))
    .order('created_at', { ascending: false })
    .limit(rows.length * 15);

  const last = new Map<string, InboxRow['last']>();
  const lastFromScanner = new Map<string, string>();
  for (const m of (msgs ?? []) as VehicleMessage[]) {
    if (!last.has(m.chat_id)) last.set(m.chat_id, m);
    if (m.sender === 'scanner' && !lastFromScanner.has(m.chat_id)) lastFromScanner.set(m.chat_id, m.created_at);
  }
  return rows.map(({ vehicles, ...chat }) => {
    const at = lastFromScanner.get(chat.id);
    return { chat, vehicle: vehicles, last: last.get(chat.id) ?? null, unread: !!at && !chat.blocked && (!chat.owner_read_at || at > chat.owner_read_at) };
  });
}

export async function fetchChat(chatId: string) {
  const [{ data: chat, error }, { data: msgs }] = await Promise.all([
    supabase.from('vehicle_chats').select('*, vehicles(*)').eq('id', chatId).maybeSingle(),
    supabase.from('vehicle_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }),
  ]);
  if (error) throw new Error(error.message);
  if (!chat) return null;
  const { vehicles, ...rest } = chat as VehicleChat & { vehicles: Vehicle };
  return { chat: rest as VehicleChat, vehicle: vehicles, messages: (msgs ?? []) as VehicleMessage[] };
}

export async function sendOwnerReply(userId: string, chatId: string, body: string) {
  const { error } = await supabase.from('vehicle_messages').insert({ chat_id: chatId, owner_id: userId, sender: 'owner', body: body.trim().slice(0, 300) });
  if (error) throw new Error(error.code === '42501' ? 'This chat has ended.' : error.message);
}

export async function updateChat(chatId: string, patch: Partial<Pick<VehicleChat, 'status' | 'blocked' | 'owner_read_at'>>) {
  const { error } = await supabase.from('vehicle_chats').update(patch).eq('id', chatId);
  if (error) throw new Error(error.message);
}
