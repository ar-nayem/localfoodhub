import { renderQrSvg, qrCentreLogo, escapeXml } from "./svg";
import { brand, qrBrand } from "../brand";
import type {
  QrTemplate,
  QrTemplateData,
  PaletteRef,
  TemplateSlot,
  TextSlot,
  TextSource,
} from "./templates/types";

/**
 * Layer 6-ish: composition. Takes a template (layer 3), the vendor/order data (layer 5)
 * and a real QR (layer 2), and returns finished SVG. Platform branding (layer 4) is read
 * straight from lib/brand.ts here and is not addressable by template config, so a vendor
 * cannot substitute their own mark for the platform's.
 *
 * The output is a plain string, which is what makes every export format fall out of one
 * renderer: the preview injects it, SVG download saves it, PNG rasterises it, PDF prints
 * it at the template's declared physical size.
 */

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export interface RenderOptions {
  template: QrTemplate;
  data: QrTemplateData;
  /** Destination the QR encodes — always a platform `/q/<token>` URL. */
  url: string;
}

export async function renderQrCard({ template, data, url }: RenderOptions): Promise<string> {
  const { canvas, palette } = template;
  const colour = (ref: PaletteRef | undefined, fallback = palette.ink): string => {
    switch (ref) {
      // QR modules are always near-black regardless of the card palette — a light module
      // colour on a light plate produces a code no scanner can read.
      case "qrModule":
        return "#111111";
      case "brand":
        return brand.primaryColorHex;
      case "brandDark":
        return brand.primaryColorDarkHex;
      case "brandContrast":
        return "#FFFFFF";
      case "ink":
        return palette.ink;
      case "muted":
        return palette.muted;
      case "surface":
        return palette.surface;
      case "paper":
        return palette.paper;
      case "accent":
        return palette.accent;
      case "accentSoft":
        return palette.accentSoft;
      case "line":
        return palette.line;
      case "white":
        return "#FFFFFF";
      default:
        return fallback;
    }
  };

  const body: string[] = [];
  const defs: string[] = [];

  // Background
  const bg = template.background;
  if (bg.kind === "solid") {
    body.push(rect(0, 0, canvas.width, canvas.height, canvas.radius ?? 0, colour(bg.fill)));
  } else if (bg.kind === "gradient") {
    const id = `g-${template.id}`;
    const angle = bg.angle ?? 135;
    const rad = (angle * Math.PI) / 180;
    defs.push(
      `<linearGradient id="${id}" x1="${0.5 - Math.cos(rad) / 2}" y1="${0.5 - Math.sin(rad) / 2}" x2="${
        0.5 + Math.cos(rad) / 2
      }" y2="${0.5 + Math.sin(rad) / 2}"><stop offset="0" stop-color="${bg.from}"/><stop offset="1" stop-color="${bg.to}"/></linearGradient>`
    );
    body.push(rect(0, 0, canvas.width, canvas.height, canvas.radius ?? 0, `url(#${id})`));
  } else {
    body.push(rect(0, 0, canvas.width, canvas.height, canvas.radius ?? 0, colour(bg.fill)));
    body.push(
      rect(
        bg.inset,
        bg.inset,
        canvas.width - bg.inset * 2,
        canvas.height - bg.inset * 2,
        bg.radius,
        colour(bg.panel)
      )
    );
  }

  for (const slot of template.slots) {
    body.push(await renderSlot(slot, { template, data, url, colour, defs }));
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" `,
    `viewBox="0 0 ${canvas.width} ${canvas.height}" font-family="${FONT}">`,
    defs.length ? `<defs>${defs.join("")}</defs>` : "",
    body.join(""),
    `</svg>`,
  ].join("");
}

interface SlotContext {
  template: QrTemplate;
  data: QrTemplateData;
  url: string;
  colour: (ref: PaletteRef | undefined, fallback?: string) => string;
  defs: string[];
}

async function renderSlot(slot: TemplateSlot, ctx: SlotContext): Promise<string> {
  switch (slot.kind) {
    case "text":
      return renderText(slot, ctx);
    case "qr":
      return renderQrSlot(slot, ctx);
    case "rect":
    case "circle":
    case "pill":
      return renderShape(slot, ctx);
    case "decor":
      return renderDecor(slot, ctx);
    case "image":
      return renderImage(slot, ctx);
    case "badge":
      return renderBadge(slot, ctx);
    default:
      return "";
  }
}

/** Resolves a slot's data source. Platform values come from brand config, never from the
 * template or the vendor. */
function resolveSource(source: TextSource, data: QrTemplateData, fallback?: string): string | null {
  const map: Record<string, string | undefined | null> = {
    platformName: brand.name,
    platformTagline: brand.qrTagline,
    footer: qrBrand.footerText,
    shopName: data.shopName,
    shopCategory: data.shopCategory,
    tableLabel: data.tableLabel,
    tableArea: data.tableArea,
    productName: data.productName,
    price: data.price,
    originalPrice: data.originalPrice,
    rating: data.rating,
    reviewCount: data.reviewCount,
    orderNumber: data.orderNumber,
    orderStatus: data.orderStatus,
    orderType: data.orderType,
    headline: data.headline,
    cta: data.cta,
    subtitle: data.subtitle,
  };
  if (source === "static") return fallback ?? null;
  const value = map[source];
  return (value ?? fallback ?? null) || null;
}

function renderText(slot: TextSlot, ctx: SlotContext): string {
  let value = resolveSource(slot.source, ctx.data, slot.value);
  if (!value) {
    if (slot.source === "static") value = slot.value ?? "";
    else if (slot.hideWhenEmpty !== false) return "";
    else value = "";
  }
  if (!value) return "";

  if (slot.format) value = slot.format.replace("{}", value);
  if (slot.uppercase) value = value.toUpperCase();
  if (slot.maxChars && value.length > slot.maxChars) value = value.slice(0, slot.maxChars - 1) + "…";

  const attrs = [
    `x="${slot.x}"`,
    `y="${slot.y}"`,
    `font-size="${slot.size}"`,
    `font-weight="${slot.weight ?? 500}"`,
    `fill="${ctx.colour(slot.color)}"`,
    `text-anchor="${slot.align ?? "middle"}"`,
    slot.tracking ? `letter-spacing="${slot.tracking}"` : "",
    slot.opacity != null ? `opacity="${slot.opacity}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<text ${attrs}>${escapeXml(value)}</text>`;
}

async function renderQrSlot(slot: Extract<TemplateSlot, { kind: "qr" }>, ctx: SlotContext): Promise<string> {
  const out: string[] = [];

  if (slot.plate) {
    const p = slot.plate.padding;
    out.push(
      rect(
        slot.x - p,
        slot.y - p,
        slot.size + p * 2,
        slot.size + p * 2,
        slot.plate.radius,
        ctx.colour(slot.plate.fill, "#FFFFFF"),
        slot.plate.shadow ? "filter=\"url(#cardShadow)\"" : undefined
      )
    );
    if (slot.plate.shadow && !ctx.defs.some((d) => d.includes("cardShadow"))) {
      ctx.defs.push(
        `<filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">` +
          `<feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.14"/></filter>`
      );
    }
  }

  const qr = await renderQrSvg(ctx.url, {
    size: slot.size,
    foreground: ctx.colour(slot.foreground, "#111111"),
    background: null,
    moduleRounding: slot.moduleRounding ?? 0,
  });

  out.push(`<g transform="translate(${slot.x},${slot.y})">${qr.markup}`);
  if (slot.centreLogo) {
    out.push(
      qrCentreLogo({
        qrSize: slot.size,
        maxLogoSize: qr.maxLogoSize,
        label: brand.shortName.slice(0, 1), // Bengali has no case; .toUpperCase() would be a no-op/confusing here
        color: brand.primaryColorHex,
      })
    );
  }
  out.push(`</g>`);

  if (slot.frame) {
    const f = slot.frame;
    const c = ctx.colour(f.color, brand.primaryColorHex);
    const x0 = slot.x - f.inset;
    const y0 = slot.y - f.inset;
    const x1 = slot.x + slot.size + f.inset;
    const y1 = slot.y + slot.size + f.inset;
    const L = f.length;
    const common = `fill="none" stroke="${c}" stroke-width="${f.width}" stroke-linecap="round"`;
    out.push(
      `<path d="M${x0} ${y0 + L}V${y0 + f.radius}A${f.radius} ${f.radius} 0 0 1 ${x0 + f.radius} ${y0}H${x0 + L}" ${common}/>`,
      `<path d="M${x1 - L} ${y0}H${x1 - f.radius}A${f.radius} ${f.radius} 0 0 1 ${x1} ${y0 + f.radius}V${y0 + L}" ${common}/>`,
      `<path d="M${x1} ${y1 - L}V${y1 - f.radius}A${f.radius} ${f.radius} 0 0 1 ${x1 - f.radius} ${y1}H${x1 - L}" ${common}/>`,
      `<path d="M${x0 + L} ${y1}H${x0 + f.radius}A${f.radius} ${f.radius} 0 0 1 ${x0} ${y1 - f.radius}V${y1 - L}" ${common}/>`
    );
  }

  return out.join("");
}

function renderShape(slot: Extract<TemplateSlot, { kind: "rect" | "circle" | "pill" }>, ctx: SlotContext): string {
  const fill = slot.fill ? ctx.colour(slot.fill) : "none";
  const stroke = slot.stroke ? `stroke="${ctx.colour(slot.stroke)}" stroke-width="${slot.strokeWidth ?? 1}"` : "";
  const dash = slot.dash ? `stroke-dasharray="${slot.dash}"` : "";
  const opacity = slot.opacity != null ? `opacity="${slot.opacity}"` : "";

  if (slot.kind === "circle") {
    const r = slot.width / 2;
    return `<circle cx="${slot.x + r}" cy="${slot.y + r}" r="${r}" fill="${fill}" ${stroke} ${dash} ${opacity}/>`;
  }
  const radius = slot.kind === "pill" ? slot.height / 2 : slot.radius ?? 0;
  return `<rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="${radius}" fill="${fill}" ${stroke} ${dash} ${opacity}/>`;
}

/** Hand-built vector motifs. Keeping them here (rather than as image assets) means they
 * scale cleanly to print and recolour with the template palette. */
function renderDecor(slot: Extract<TemplateSlot, { kind: "decor" }>, ctx: SlotContext): string {
  const c = ctx.colour(slot.color, ctx.template.palette.accent);
  const s = slot.size;
  const o = slot.opacity != null ? `opacity="${slot.opacity}"` : "";
  const transform = `transform="translate(${slot.x},${slot.y}) rotate(${slot.rotate ?? 0})"`;

  const shapes: Record<string, string> = {
    leaf: `<path d="M0 ${s} C0 ${s * 0.45} ${s * 0.45} 0 ${s} 0 C${s} ${s * 0.55} ${s * 0.55} ${s} 0 ${s}Z" fill="${c}"/>
           <path d="M${s * 0.12} ${s * 0.88} L${s * 0.85} ${s * 0.15}" stroke="${ctx.template.palette.paper}" stroke-width="${s * 0.05}" stroke-linecap="round" opacity="0.5"/>`,
    "leaf-pair": `<path d="M0 ${s * 0.6} C0 ${s * 0.27} ${s * 0.27} 0 ${s * 0.6} 0 C${s * 0.6} ${s * 0.33} ${s * 0.33} ${s * 0.6} 0 ${s * 0.6}Z" fill="${c}"/>
                  <path d="M${s * 0.42} ${s} C${s * 0.42} ${s * 0.72} ${s * 0.66} ${s * 0.48} ${s} ${s * 0.48} C${s} ${s * 0.76} ${s * 0.74} ${s} ${s * 0.42} ${s}Z" fill="${c}" opacity="0.72"/>`,
    arc: `<path d="M0 ${s} A${s} ${s} 0 0 1 ${s * 2} ${s}" fill="none" stroke="${c}" stroke-width="${s * 0.16}" stroke-linecap="round"/>`,
    dots: `<g fill="${c}">${[0, 1, 2, 3]
      .map((i) => `<circle cx="${i * s * 0.42}" cy="${(i % 2) * s * 0.3}" r="${s * 0.11}"/>`)
      .join("")}</g>`,
    wave: `<path d="M0 ${s * 0.5} q ${s * 0.5} -${s * 0.5} ${s} 0 t ${s} 0" fill="none" stroke="${c}" stroke-width="${s * 0.14}" stroke-linecap="round"/>`,
    sparkle: `<path d="M${s / 2} 0 L${s * 0.6} ${s * 0.4} L${s} ${s / 2} L${s * 0.6} ${s * 0.6} L${s / 2} ${s} L${s * 0.4} ${s * 0.6} L0 ${s / 2} L${s * 0.4} ${s * 0.4}Z" fill="${c}"/>`,
    cutlery: `<g stroke="${c}" stroke-width="${s * 0.1}" stroke-linecap="round" fill="none">
                <path d="M${s * 0.25} 0 V${s}"/><path d="M${s * 0.1} 0 V${s * 0.35}"/><path d="M${s * 0.4} 0 V${s * 0.35}"/>
                <path d="M${s * 0.78} ${s} V${s * 0.45}"/><path d="M${s * 0.78} ${s * 0.45} a${s * 0.16} ${s * 0.22} 0 1 0 0 -${s * 0.42}"/></g>`,
    steam: `<g stroke="${c}" stroke-width="${s * 0.12}" stroke-linecap="round" fill="none">
              <path d="M0 ${s} q ${s * 0.28} -${s * 0.34} 0 -${s * 0.68}"/>
              <path d="M${s * 0.42} ${s} q ${s * 0.28} -${s * 0.34} 0 -${s * 0.68}"/></g>`,
  };

  return `<g ${transform} ${o}>${shapes[slot.motif] ?? ""}</g>`;
}

function renderImage(slot: Extract<TemplateSlot, { kind: "image" }>, ctx: SlotContext): string {
  const src = slot.source === "productImage" ? ctx.data.productImageUrl : ctx.data.shopLogoUrl;
  const radius = slot.radius ?? 0;
  const ring = slot.ring
    ? `<rect x="${slot.x - slot.ring.width / 2}" y="${slot.y - slot.ring.width / 2}" width="${
        slot.width + slot.ring.width
      }" height="${slot.height + slot.ring.width}" rx="${radius + slot.ring.width / 2}" fill="none" stroke="${ctx.colour(
        slot.ring.color
      )}" stroke-width="${slot.ring.width}"/>`
    : "";

  if (src) {
    const clipId = `clip-${slot.source}-${slot.x}-${slot.y}`;
    ctx.defs.push(
      `<clipPath id="${clipId}"><rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="${radius}"/></clipPath>`
    );
    return (
      `<image href="${escapeXml(absoluteUrl(src))}" x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" ` +
      `preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>${ring}`
    );
  }

  // No uploaded image — a tinted plate with a glyph, so the card still reads as designed.
  return (
    rect(slot.x, slot.y, slot.width, slot.height, radius, ctx.colour("accentSoft")) +
    `<text x="${slot.x + slot.width / 2}" y="${slot.y + slot.height / 2}" text-anchor="middle" dominant-baseline="central" font-size="${
      Math.min(slot.width, slot.height) * 0.5
    }">${slot.fallbackGlyph ?? "🍽️"}</text>` +
    ring
  );
}

function renderBadge(slot: Extract<TemplateSlot, { kind: "badge" }>, ctx: SlotContext): string {
  const value = resolveSource(slot.source, ctx.data, slot.value);
  if (!value && slot.hideWhenEmpty !== false) return "";
  const text = slot.format ? slot.format.replace("{}", value ?? "") : value ?? "";
  // Approximate advance width for the system stack — good enough to size a pill.
  const width = slot.paddingX * 2 + text.length * slot.size * 0.56 + (slot.icon ? slot.size * 1.1 : 0);
  const fill = ctx.colour(slot.fill, ctx.template.palette.accentSoft);
  const colour = ctx.colour(slot.color, ctx.template.palette.ink);
  const iconGap = slot.icon ? slot.size * 1.1 : 0;

  return [
    `<rect x="${slot.x}" y="${slot.y}" width="${round(width)}" height="${slot.height}" rx="${slot.height / 2}" fill="${fill}"/>`,
    slot.icon ? badgeIcon(slot.icon, slot.x + slot.paddingX, slot.y + slot.height / 2, slot.size * 0.72, colour) : "",
    `<text x="${round(slot.x + slot.paddingX + iconGap)}" y="${slot.y + slot.height / 2}" dominant-baseline="central" ` +
      `font-size="${slot.size}" font-weight="600" fill="${colour}">${escapeXml(text)}</text>`,
  ].join("");
}

function badgeIcon(icon: string, x: number, cy: number, size: number, colour: string): string {
  const s = size;
  const y = cy - s / 2;
  const stroke = `fill="none" stroke="${colour}" stroke-width="${s * 0.16}" stroke-linecap="round" stroke-linejoin="round"`;
  const icons: Record<string, string> = {
    star: `<path d="M${s / 2} 0 l${s * 0.15} ${s * 0.32} ${s * 0.35} ${s * 0.05} -${s * 0.25} ${s * 0.25} ${s * 0.06} ${s * 0.35} -${s * 0.31} -${s * 0.17} -${s * 0.31} ${s * 0.17} ${s * 0.06} -${s * 0.35} -${s * 0.25} -${s * 0.25} ${s * 0.35} -${s * 0.05}Z" fill="${colour}"/>`,
    clock: `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.45}" ${stroke}/><path d="M${s / 2} ${s * 0.25}V${s / 2}l${s * 0.2} ${s * 0.12}" ${stroke}/>`,
    tag: `<path d="M${s * 0.1} ${s * 0.5} L${s * 0.5} ${s * 0.1} H${s * 0.9} V${s * 0.5} L${s * 0.5} ${s * 0.9}Z" ${stroke}/><circle cx="${s * 0.68}" cy="${s * 0.32}" r="${s * 0.07}" fill="${colour}"/>`,
    check: `<path d="M${s * 0.2} ${s * 0.55} l${s * 0.2} ${s * 0.2} ${s * 0.4} -${s * 0.45}" ${stroke}/>`,
    bike: `<circle cx="${s * 0.25}" cy="${s * 0.7}" r="${s * 0.22}" ${stroke}/><circle cx="${s * 0.75}" cy="${s * 0.7}" r="${s * 0.22}" ${stroke}/><path d="M${s * 0.25} ${s * 0.7} L${s * 0.45} ${s * 0.3} H${s * 0.7} l${s * 0.05} ${s * 0.4}" ${stroke}/>`,
    bag: `<path d="M${s * 0.2} ${s * 0.35} h${s * 0.6} l-${s * 0.06} ${s * 0.55} h-${s * 0.48}Z" ${stroke}/><path d="M${s * 0.36} ${s * 0.35} a${s * 0.14} ${s * 0.14} 0 0 1 ${s * 0.28} 0" ${stroke}/>`,
  };
  return `<g transform="translate(${x},${y})">${icons[icon] ?? ""}</g>`;
}

function rect(x: number, y: number, w: number, h: number, r: number, fill: string, extra?: string): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra ?? ""}/>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Uploaded images live under /uploads; SVG rendered outside the page needs them absolute. */
function absoluteUrl(src: string): string {
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4410";
  return `${base}${src.startsWith("/") ? "" : "/"}${src}`;
}
