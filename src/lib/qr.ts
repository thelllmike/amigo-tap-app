import QRCode from 'qrcode';

/**
 * The AmigoTap QR design — square body modules, leaf-shaped eye frames, round
 * eye balls and the AmigoTap mark in the middle. A port of the web's
 * lib/linktree/qr-design.ts that returns geometry, so the app can draw it with
 * react-native-svg (and snapshot it to PNG) as well as export the same SVG.
 */

/** Quiet zone around the code, in modules. Scanners want at least 2. */
const MARGIN = 3;
/** Share of the code's width the centre logo may cover. Error correction H recovers up to 30%. */
const LOGO_SHARE = 0.24;

/** AmigoTap "A" with NFC waves, from public/favicon.svg, inside this box of its viewBox. */
export const MARK_BOX = { x: 200, y: 140, w: 1100, h: 1180 };
export const MARK_A =
  'M 1291.414062 1260.015625 L 976.339844 626.292969 C 883.570312 709.265625 801.933594 854.847656 806.488281 974.128906 L 901.820312 1162.125 C 905.242188 1168.875 911.078125 1174.078125 918.175781 1176.714844 L 1253.964844 1301.632812 C 1279.539062 1311.152344 1303.566406 1284.449219 1291.414062 1260.015625 Z M 725.996094 913.699219 C 725.1875 914.886719 724.4375 916.152344 723.773438 917.507812 L 604.15625 1159.9375 C 600.757812 1166.820312 594.855469 1172.160156 587.65625 1174.839844 L 245.679688 1302.046875 C 220.253906 1311.519531 196.269531 1285.152344 208.082031 1260.730469 L 715.710938 211.125 C 726.605469 188.601562 758.632812 188.417969 769.773438 210.820312 L 965.566406 604.648438 C 858.207031 681.386719 774.140625 788.632812 725.996094 913.699219';
export const MARK_WAVES = [
  'M 963.054688 266.378906 C 963.054688 246.097656 955.644531 227.507812 943.394531 213.175781 C 941.132812 210.527344 937.09375 210.371094 934.632812 212.832031 C 932.433594 215.03125 932.296875 218.546875 934.320312 220.910156 C 944.792969 233.152344 951.128906 249.039062 951.128906 266.378906 C 951.128906 283.707031 944.792969 299.59375 934.320312 311.835938 C 932.296875 314.199219 932.433594 317.714844 934.632812 319.914062 C 937.09375 322.375 941.132812 322.21875 943.394531 319.574219 C 955.644531 305.25 963.054688 286.660156 963.054688 266.378906',
  'M 1007.15625 266.378906 C 1007.15625 233.886719 994.804688 204.230469 974.546875 181.851562 C 972.242188 179.308594 968.292969 179.167969 965.867188 181.59375 L 965.863281 181.601562 C 963.601562 183.863281 963.554688 187.480469 965.699219 189.851562 C 984.042969 210.113281 995.226562 236.964844 995.226562 266.378906 C 995.226562 295.792969 984.046875 322.640625 965.703125 342.890625 C 963.554688 345.261719 963.605469 348.882812 965.867188 351.148438 C 968.296875 353.574219 972.242188 353.4375 974.546875 350.894531 C 994.804688 328.527344 1007.15625 298.871094 1007.15625 266.378906',
  'M 1048.367188 266.378906 C 1048.367188 222.472656 1031.359375 182.457031 1003.589844 152.574219 C 1001.296875 150.109375 997.402344 150.066406 995.019531 152.445312 L 995.015625 152.445312 C 992.742188 154.722656 992.699219 158.378906 994.890625 160.738281 C 1020.65625 188.484375 1036.441406 225.628906 1036.441406 266.378906 C 1036.441406 307.128906 1020.65625 344.269531 994.890625 372.007812 C 992.703125 374.367188 992.742188 378.023438 995.019531 380.300781 C 997.402344 382.679688 1001.296875 382.636719 1003.589844 380.167969 C 1031.359375 350.296875 1048.367188 310.285156 1048.367188 266.378906',
];

type Radii = [number, number, number, number];

function roundedRect(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: Radii) {
  return [
    `M${x + tl} ${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : '',
    'Z',
  ].join('');
}

/** An eye frame shaped like a leaf: one square corner pointing at the middle. */
function eyeFrame(x: number, y: number, sharp: 0 | 1 | 2 | 3) {
  const outer: Radii = [2.6, 2.6, 2.6, 2.6];
  const inner: Radii = [1.6, 1.6, 1.6, 1.6];
  outer[sharp] = 0;
  inner[sharp] = 0;
  return roundedRect(x, y, 7, 7, outer) + roundedRect(x + 1, y + 1, 5, 5, inner);
}

export interface QrGeometry {
  /** Full side length in modules, quiet zone included. */
  size: number;
  body: string;
  frames: string;
  balls: { cx: number; cy: number; r: number }[];
  /** The centre plate and the transform that fits the mark into it, when a logo is drawn. */
  logo: { x: number; y: number; w: number; rx: number; tx: number; ty: number; scale: number } | null;
}

export function qrGeometry(text: string, logo = true): QrGeometry {
  const qr = QRCode.create(text, { errorCorrectionLevel: logo ? 'H' : 'M' });
  const n = qr.modules.size;
  const dark = (r: number, c: number) => qr.modules.data[r * n + c] === 1;

  // Logo hole: an odd number of modules so it centres exactly.
  let hole = logo ? Math.round(n * LOGO_SHARE) : 0;
  if (hole && hole % 2 === 0) hole += 1;
  const holeStart = (n - hole) / 2;

  const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const inHole = (r: number, c: number) =>
    hole > 0 && r >= holeStart && r < holeStart + hole && c >= holeStart && c < holeStart + hole;

  let body = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!dark(r, c) || inFinder(r, c) || inHole(r, c)) continue;
      body += `M${c + MARGIN} ${r + MARGIN}h1v1h-1z`;
    }
  }

  const far = n - 7 + MARGIN;
  const frames = eyeFrame(MARGIN, MARGIN, 2) + eyeFrame(far, MARGIN, 3) + eyeFrame(MARGIN, far, 1);
  const balls = [
    [MARGIN, MARGIN],
    [far, MARGIN],
    [MARGIN, far],
  ].map(([x, y]) => ({ cx: x + 3.5, cy: y + 3.5, r: 1.6 }));

  let logoGeo: QrGeometry['logo'] = null;
  if (hole) {
    const inset = hole * 0.08;
    const fit = (hole - inset * 2) / Math.max(MARK_BOX.w, MARK_BOX.h);
    logoGeo = {
      x: holeStart + MARGIN + 0.3,
      y: holeStart + MARGIN + 0.3,
      w: hole - 0.6,
      rx: hole * 0.12,
      tx: holeStart + MARGIN + inset + (hole - inset * 2 - MARK_BOX.w * fit) / 2 - MARK_BOX.x * fit,
      ty: holeStart + MARGIN + inset + (hole - inset * 2 - MARK_BOX.h * fit) / 2 - MARK_BOX.y * fit,
      scale: fit,
    };
  }

  return { size: n + MARGIN * 2, body, frames, balls, logo: logoGeo };
}

/** The same design as a standalone SVG file, for "Download SVG". */
export function qrSvg(text: string, { logo = true, foreground = '#000000', background = '#ffffff' } = {}) {
  const g = qrGeometry(text, logo);
  const mark = g.logo
    ? `<rect x="${g.logo.x}" y="${g.logo.y}" width="${g.logo.w}" height="${g.logo.w}" rx="${g.logo.rx}" fill="${background}"/>` +
      `<g transform="translate(${g.logo.tx} ${g.logo.ty}) scale(${g.logo.scale})" fill="${foreground}">` +
      [MARK_A, ...MARK_WAVES].map((d) => `<path d="${d}"/>`).join('') +
      `</g>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.size} ${g.size}" width="${g.size * 10}" height="${g.size * 10}">` +
    `<rect width="${g.size}" height="${g.size}" fill="${background}"/>` +
    `<g fill="${foreground}"><path d="${g.body}"/><path fill-rule="evenodd" d="${g.frames}"/>` +
    g.balls.map((b) => `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}"/>`).join('') +
    `</g>${mark}</svg>`
  );
}
