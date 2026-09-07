import QRCodeLib from "qrcode";

/**
 * Layer 2 of the QR system: turning a destination URL into a real, scannable QR code.
 *
 * This is deliberately the ONLY place a QR matrix is produced. It emits vector paths from
 * the `qrcode` library's own matrix — never a bitmap, never anything generated or traced
 * by hand — so the result is always a genuine, decodable code at any print size.
 *
 * Error correction is fixed at level H (~30% recoverable). That is what makes the centre
 * logo safe: the covered modules fall well inside the recoverable budget as long as the
 * logo stays within the size cap enforced below.
 */

export interface QrSvgOptions {
  /** Side length of the QR itself, in the same user units as the enclosing SVG. */
  size: number;
  /** Module colour. */
  foreground?: string;
  /** Background behind the modules; `null` leaves it transparent. */
  background?: string | null;
  /** Quiet zone in modules. The spec requires 4; going lower breaks scanners. */
  quietZoneModules?: number;
  /** Corner rounding applied to each module, 0–0.5 of a module. */
  moduleRounding?: number;
}

export interface QrSvg {
  /** SVG markup for the code, sized `size` × `size`, positioned at 0,0. */
  markup: string;
  /** Modules per side, excluding the quiet zone. */
  moduleCount: number;
  /** Width of one module in user units. */
  moduleSize: number;
  /** Largest safe centre-logo side length, in user units. */
  maxLogoSize: number;
}

/** Level H tolerates ~30% loss; keeping the logo under 22% of the area leaves ample
 * margin for print imperfection and angled scans. */
const MAX_LOGO_AREA_RATIO = 0.22;

export async function renderQrSvg(url: string, opts: QrSvgOptions): Promise<QrSvg> {
  const {
    size,
    foreground = "#111111",
    background = "#FFFFFF",
    quietZoneModules = 4,
    moduleRounding = 0,
  } = opts;

  const qr = QRCodeLib.create(url, { errorCorrectionLevel: "H" });
  const moduleCount = qr.modules.size;
  const data = qr.modules.data;

  // The quiet zone is part of the code, so it has to come out of `size` rather than being
  // added around it — otherwise the finished card is larger than the template allotted.
  const totalModules = moduleCount + quietZoneModules * 2;
  const moduleSize = size / totalModules;
  const offset = quietZoneModules * moduleSize;

  const parts: string[] = [];
  if (background) {
    parts.push(`<rect width="${round(size)}" height="${round(size)}" fill="${background}"/>`);
  }

  if (moduleRounding > 0) {
    const r = round(Math.min(0.5, moduleRounding) * moduleSize);
    for (let y = 0; y < moduleCount; y++) {
      for (let x = 0; x < moduleCount; x++) {
        if (!data[y * moduleCount + x]) continue;
        parts.push(
          `<rect x="${round(offset + x * moduleSize)}" y="${round(offset + y * moduleSize)}" ` +
            `width="${round(moduleSize)}" height="${round(moduleSize)}" rx="${r}" fill="${foreground}"/>`
        );
      }
    }
  } else {
    // Merge horizontal runs into single path segments — a 45×45 code drops from ~1000
    // elements to a couple of hundred, which keeps the live preview cheap to re-render.
    const segments: string[] = [];
    for (let y = 0; y < moduleCount; y++) {
      let runStart = -1;
      for (let x = 0; x <= moduleCount; x++) {
        const on = x < moduleCount && !!data[y * moduleCount + x];
        if (on && runStart === -1) runStart = x;
        if (!on && runStart !== -1) {
          segments.push(
            `M${round(offset + runStart * moduleSize)} ${round(offset + y * moduleSize)}` +
              `h${round((x - runStart) * moduleSize)}v${round(moduleSize)}` +
              `h-${round((x - runStart) * moduleSize)}z`
          );
          runStart = -1;
        }
      }
    }
    parts.push(`<path d="${segments.join("")}" fill="${foreground}" shape-rendering="crispEdges"/>`);
  }

  const maxLogoSize = Math.sqrt(MAX_LOGO_AREA_RATIO) * (moduleCount * moduleSize);

  return {
    markup: parts.join(""),
    moduleCount,
    moduleSize,
    maxLogoSize: Math.floor(maxLogoSize),
  };
}

/**
 * Centre badge for the platform mark. Sized against `maxLogoSize` so readability is
 * preserved by construction — a caller cannot request a logo large enough to break the
 * code. The white plate behind it gives scanners a clean edge to work against.
 */
export function qrCentreLogo({
  qrSize,
  maxLogoSize,
  label,
  color,
  requested,
}: {
  qrSize: number;
  maxLogoSize: number;
  label: string;
  color: string;
  requested?: number;
}): string {
  const side = Math.min(requested ?? maxLogoSize * 0.8, maxLogoSize);
  const x = (qrSize - side) / 2;
  const plate = side * 1.16;
  const plateX = (qrSize - plate) / 2;

  return [
    `<rect x="${round(plateX)}" y="${round(plateX)}" width="${round(plate)}" height="${round(plate)}" rx="${round(plate * 0.24)}" fill="#FFFFFF"/>`,
    `<rect x="${round(x)}" y="${round(x)}" width="${round(side)}" height="${round(side)}" rx="${round(side * 0.26)}" fill="${color}"/>`,
    `<text x="${round(qrSize / 2)}" y="${round(qrSize / 2)}" text-anchor="middle" dominant-baseline="central" ` +
      `font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-weight="700" ` +
      `font-size="${round(side * 0.56)}" fill="#FFFFFF">${escapeXml(label)}</text>`,
  ].join("");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
