/**
 * The platforms offered in "Add a link". `platform` is the value stored in
 * social_links.platform (see the web's Platform type); Maps and Menu have no
 * platform of their own there, so they save as 'other' with a label.
 */
export interface PlatformDef {
  key: string;
  platform: string;
  name: string;
  code: string;
  color: string;
  field: string;
  placeholder: string;
  /** Phone-number style input with the +94 prefix shown separately. */
  phone?: boolean;
  keyboard?: 'default' | 'email-address' | 'phone-pad' | 'url';
  /** Turns what the owner typed into the stored href. */
  toUrl: (input: string) => string;
  label?: string;
}

const digits = (s: string) => s.replace(/\D/g, '').replace(/^0+/, '');
const withHttps = (s: string) => (/^[a-z]+:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`);
const handle = (base: string) => (s: string) => {
  const t = s.trim();
  if (/^https?:\/\//i.test(t) || t.includes('.')) return withHttps(t);
  return `${base}${t.replace(/^@/, '')}`;
};

export const PLATFORMS: PlatformDef[] = [
  { key: 'whatsapp', platform: 'whatsapp', name: 'WhatsApp', code: 'WA', color: '#4E8F4F', field: 'WhatsApp number', placeholder: '77 000 0000', phone: true, keyboard: 'phone-pad', toUrl: (s) => `https://wa.me/94${digits(s)}` },
  { key: 'instagram', platform: 'instagram', name: 'Instagram', code: 'IG', color: '#8E3B6E', field: 'Instagram handle', placeholder: '@yourbusiness', toUrl: handle('https://instagram.com/') },
  { key: 'facebook', platform: 'facebook', name: 'Facebook', code: 'FB', color: '#3D5BC4', field: 'Facebook page', placeholder: 'facebook.com/yourbusiness', keyboard: 'url', toUrl: handle('https://facebook.com/') },
  { key: 'tiktok', platform: 'tiktok', name: 'TikTok', code: 'TT', color: '#2A2A2A', field: 'TikTok handle', placeholder: '@yourbusiness', toUrl: handle('https://tiktok.com/@') },
  { key: 'googlereview', platform: 'googlereview', name: 'Google review', code: 'G★', color: '#4A6CD8', field: 'Review link', placeholder: 'g.page/r/…', keyboard: 'url', toUrl: withHttps },
  { key: 'website', platform: 'website', name: 'Website', code: 'WW', color: '#555555', field: 'Website', placeholder: 'yourbusiness.lk', keyboard: 'url', toUrl: withHttps },
  { key: 'phone', platform: 'phone', name: 'Phone', code: 'TL', color: '#3A3A44', field: 'Phone number', placeholder: '77 000 0000', phone: true, keyboard: 'phone-pad', toUrl: (s) => `tel:+94${digits(s)}`, label: 'Call' },
  { key: 'email', platform: 'email', name: 'Email', code: 'EM', color: '#4A4A4A', field: 'Email address', placeholder: 'hello@yourbusiness.lk', keyboard: 'email-address', toUrl: (s) => `mailto:${s.trim()}` },
  { key: 'youtube', platform: 'youtube', name: 'YouTube', code: 'YT', color: '#A0281F', field: 'Channel link', placeholder: 'youtube.com/@yourbusiness', keyboard: 'url', toUrl: handle('https://youtube.com/@') },
  { key: 'maps', platform: 'other', name: 'Maps', code: 'MP', color: '#3E6B3A', field: 'Google Maps link', placeholder: 'maps.app.goo.gl/…', keyboard: 'url', toUrl: withHttps, label: 'Maps' },
  { key: 'menu', platform: 'other', name: 'Menu', code: 'ME', color: '#B5441B', field: 'Menu link', placeholder: 'yourbusiness.lk/menu', keyboard: 'url', toUrl: withHttps, label: 'Menu' },
  { key: 'custom', platform: 'other', name: 'Custom', code: '+', color: '#2A2A2A', field: 'Link', placeholder: 'https://…', keyboard: 'url', toUrl: withHttps },
];

const OTHER_CODES: Record<string, { code: string; color: string }> = {
  twitter: { code: 'X', color: '#2A2A2A' },
  linkedin: { code: 'IN', color: '#2D5FA0' },
  telegram: { code: 'TG', color: '#2E7BB8' },
  github: { code: 'GH', color: '#333333' },
  threads: { code: 'TH', color: '#2A2A2A' },
  snapchat: { code: 'SC', color: '#B9A400' },
  spotify: { code: 'SP', color: '#2F7D46' },
  tripadvisor: { code: 'TA', color: '#2F7D5E' },
  booking: { code: 'BK', color: '#2E46A8' },
};

/** Tile code + colour for a stored link. */
export function linkBadge(platform: string, label?: string | null) {
  const byLabel = label ? PLATFORMS.find((p) => p.platform === 'other' && p.label?.toLowerCase() === label.toLowerCase()) : undefined;
  const def = byLabel ?? PLATFORMS.find((p) => p.platform === platform && p.platform !== 'other');
  if (def) return { code: def.code, color: def.color };
  if (OTHER_CODES[platform]) return OTHER_CODES[platform];
  const text = (label || platform || '?').replace(/[^a-z0-9]/gi, '');
  return { code: text.slice(0, 2).toUpperCase() || '?', color: '#3A3A3A' };
}

export function linkTitle(platform: string, label?: string | null) {
  if (label?.trim()) return label.trim();
  const def = PLATFORMS.find((p) => p.platform === platform);
  if (def) return def.label ?? def.name;
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/** What to show under a link title: the href without scheme noise. */
export function linkSubtitle(url: string) {
  return url.replace(/^(https?:\/\/|mailto:|tel:)/, '').replace(/^www\./, '');
}

/** The href a visitor's phone should open. */
export function linkHref(platform: string, url: string) {
  if (platform === 'email' && !url.startsWith('mailto:')) return `mailto:${url}`;
  if (platform === 'phone' && !url.startsWith('tel:')) return `tel:${url}`;
  return url;
}
