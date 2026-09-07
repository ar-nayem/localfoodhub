/**
 * Layer 3 of the QR system: template definitions.
 *
 * A template is pure data — no JSX, no per-type branching, no knowledge of how a QR is
 * produced or where its destination came from. The renderer (lib/qr/render.ts) walks this
 * config and emits SVG. Adding template #31 means appending one object to the registry;
 * nothing in QR generation, branding or export changes.
 */

export type QrCardType =
  | "TABLE"
  | "SHOP"
  | "MENU"
  | "PRODUCT"
  | "ORDER"
  | "PICKUP"
  | "DELIVERY"
  | "EXPLORE";

/** Vendor- and order-supplied values a template may reference. Every field is optional:
 * a template asks for what it wants and the renderer omits slots with nothing to show. */
export interface QrTemplateData {
  shopName?: string;
  shopLogoUrl?: string | null;
  shopCategory?: string;
  tableLabel?: string;
  tableArea?: string;
  productName?: string;
  productImageUrl?: string | null;
  price?: string;
  originalPrice?: string;
  rating?: string;
  reviewCount?: string;
  orderNumber?: string;
  orderStatus?: string;
  orderType?: string;
  headline?: string;
  cta?: string;
  subtitle?: string;
}

/** Which piece of data a text slot renders. `static` uses the slot's own `value`. */
export type TextSource =
  | "static"
  | "platformName"
  | "platformTagline"
  | "shopName"
  | "shopCategory"
  | "tableLabel"
  | "tableArea"
  | "productName"
  | "price"
  | "originalPrice"
  | "rating"
  | "reviewCount"
  | "orderNumber"
  | "orderStatus"
  | "orderType"
  | "headline"
  | "cta"
  | "subtitle"
  | "footer";

export interface TextSlot {
  kind: "text";
  source: TextSource;
  /** Literal text for `source: "static"`, or a fallback when the data field is absent. */
  value?: string;
  /** Wraps the resolved value, e.g. "Table {}" or "★ {}". */
  format?: string;
  x: number;
  y: number;
  size: number;
  weight?: 400 | 500 | 600 | 700 | 800;
  color?: PaletteRef;
  align?: "start" | "middle" | "end";
  /** Uppercase with letter-spacing — used for eyebrow labels. */
  tracking?: number;
  uppercase?: boolean;
  maxChars?: number;
  /** Hide the slot entirely when its data is missing (default true for non-static). */
  hideWhenEmpty?: boolean;
  opacity?: number;
}

export interface QrSlot {
  kind: "qr";
  x: number;
  y: number;
  size: number;
  /** Rounded plate behind the code. */
  plate?: { padding: number; radius: number; fill: PaletteRef; shadow?: boolean };
  /** Decorative corner brackets around the code. */
  frame?: { color: PaletteRef; inset: number; length: number; width: number; radius: number };
  moduleRounding?: number;
  /** Platform mark in the centre. Size is capped by the generator for readability. */
  centreLogo?: boolean;
  foreground?: PaletteRef;
}

export interface ShapeSlot {
  kind: "rect" | "circle" | "pill";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: PaletteRef;
  stroke?: PaletteRef;
  strokeWidth?: number;
  opacity?: number;
  /** Dashed outline, for ticket-stub style dividers. */
  dash?: string;
}

/** Decorative vector flourishes — leaves, arcs, dots, steam. Drawn from the palette so a
 * template stays coherent when its colours change. */
export interface DecorSlot {
  kind: "decor";
  motif: "leaf" | "leaf-pair" | "arc" | "dots" | "wave" | "sparkle" | "cutlery" | "steam";
  x: number;
  y: number;
  size: number;
  rotate?: number;
  color?: PaletteRef;
  opacity?: number;
}

/** Vendor imagery — food photo or shop logo. Renders a palette-tinted placeholder with a
 * glyph when the shop hasn't uploaded one, so the card is never visibly broken. */
export interface ImageSlot {
  kind: "image";
  source: "productImage" | "shopLogo";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  /** Glyph shown when there is no uploaded image. */
  fallbackGlyph?: string;
  ring?: { color: PaletteRef; width: number };
}

export interface BadgeSlot {
  kind: "badge";
  source: TextSource;
  value?: string;
  format?: string;
  x: number;
  y: number;
  height: number;
  paddingX: number;
  size: number;
  fill?: PaletteRef;
  color?: PaletteRef;
  icon?: "star" | "clock" | "tag" | "check" | "bike" | "bag";
  hideWhenEmpty?: boolean;
}

export type TemplateSlot = TextSlot | QrSlot | ShapeSlot | DecorSlot | ImageSlot | BadgeSlot;

/** Palette keys. `brand*` entries resolve to locked platform values at render time — a
 * template cannot hard-code a different brand colour. */
export type PaletteRef =
  | "qrModule"
  | "brand"
  | "brandDark"
  | "brandContrast"
  | "ink"
  | "muted"
  | "surface"
  | "paper"
  | "accent"
  | "accentSoft"
  | "line"
  | "white";

export interface TemplatePalette {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  line: string;
}

export type TemplateBackground =
  | { kind: "solid"; fill: PaletteRef }
  | { kind: "gradient"; from: string; to: string; angle?: number }
  | { kind: "panel"; fill: PaletteRef; panel: PaletteRef; inset: number; radius: number };

export interface QrTemplate {
  id: string;
  name: string;
  /** QR types this design is offered for. */
  types: QrCardType[];
  /** Physical print size in millimetres, used for PDF output. */
  print: { widthMm: number; heightMm: number };
  canvas: { width: number; height: number; radius?: number };
  background: TemplateBackground;
  palette: TemplatePalette;
  slots: TemplateSlot[];
  /** Shown in the picker. */
  description?: string;
}
