import { PALETTES, type PaletteName } from "./palettes";
import type { QrCardType, QrTemplate, TemplateSlot } from "./types";

/**
 * The template catalogue. Every entry is data — the renderer walks it without knowing
 * which QR type it is drawing, so adding template #33 means appending one object here and
 * nothing else in the system changes.
 *
 * The `layout*` helpers below are composition shortcuts, not a second rendering path:
 * each returns a plain slot array identical in shape to one written out by hand.
 */

const W = 620;
const H = 880;
const CENTER = W / 2;
const PRINT = { widthMm: 100, heightMm: 142 };

/** Platform lockup — wordmark plus tagline. Present on every template by construction, so
 * no design can ship without platform attribution. */
function platformHeader(y: number, onDark = false): TemplateSlot[] {
  return [
    {
      kind: "text",
      source: "platformName",
      x: CENTER,
      y,
      size: 34,
      weight: 800,
      color: onDark ? "white" : "brand",
      align: "middle",
    },
    {
      kind: "text",
      source: "platformTagline",
      x: CENTER,
      y: y + 24,
      size: 15,
      weight: 500,
      color: "muted",
      align: "middle",
    },
  ];
}

/** Footer lockup — "Powered by …" plus the platform domain. */
function platformFooter(y: number): TemplateSlot[] {
  return [
    { kind: "rect", x: 70, y: y - 30, width: W - 140, height: 1, fill: "line" },
    {
      kind: "text",
      source: "footer",
      x: CENTER,
      y,
      size: 15,
      weight: 600,
      color: "muted",
      align: "middle",
    },
  ];
}

interface CardSpec {
  id: string;
  name: string;
  type: QrCardType;
  palette: PaletteName;
  description: string;
  /** Visual family — determines the arrangement around the QR. */
  layout: "classic" | "banner" | "ticket" | "poster" | "photo" | "compact";
  decor?: "leaf-pair" | "leaf" | "arc" | "dots" | "wave" | "sparkle" | "cutlery" | "steam" | "none";
  /** Headline text baked into the design; vendor data fills the rest. */
  headline?: string;
  /** Default call to action; a vendor may override it per QR. */
  cta: string;
  /** Which vendor fields this design displays. */
  showsProduct?: boolean;
  showsTable?: boolean;
  showsOrder?: boolean;
  qrRounding?: number;
}

function buildTemplate(spec: CardSpec): QrTemplate {
  const p = PALETTES[spec.palette];
  const onDark = spec.palette === "forest" || spec.palette === "charcoal";
  const slots: TemplateSlot[] = [];

  const preferredQr = spec.layout === "poster" ? 260 : spec.layout === "compact" ? 250 : 280;

  // ── Header band ────────────────────────────────────────────────────────────
  if (spec.layout === "banner") {
    slots.push({ kind: "rect", x: 0, y: 0, width: W, height: 168, radius: 0, fill: "brand" });
    slots.push(
      { kind: "text", source: "platformName", x: CENTER, y: 66, size: 34, weight: 800, color: "white", align: "middle" },
      { kind: "text", source: "platformTagline", x: CENTER, y: 92, size: 15, weight: 500, color: "white", align: "middle", opacity: 0.85 }
    );
    if (spec.headline) {
      slots.push({
        kind: "text",
        source: "static",
        value: spec.headline,
        x: CENTER,
        y: 138,
        size: 22,
        weight: 700,
        color: "white",
        align: "middle",
      });
    }
  } else {
    slots.push(...platformHeader(72, onDark));
    if (spec.headline) {
      slots.push({
        kind: "text",
        source: "static",
        value: spec.headline,
        x: CENTER,
        y: 128,
        size: 24,
        weight: 700,
        color: "ink",
        align: "middle",
      });
    }
  }

  // ── Subject block: what this particular QR is for ──────────────────────────
  let cursor = spec.layout === "banner" ? 224 : spec.headline ? 178 : 150;

  if (spec.showsTable) {
    slots.push(
      {
        kind: "text",
        source: "static",
        value: "Table",
        x: CENTER,
        y: cursor,
        size: 16,
        weight: 600,
        color: "muted",
        align: "middle",
        uppercase: true,
        tracking: 4,
      },
      {
        kind: "text",
        source: "tableLabel",
        value: "—",
        x: CENTER,
        y: cursor + 64,
        size: 76,
        weight: 800,
        color: "brand",
        align: "middle",
        hideWhenEmpty: false,
      },
      {
        kind: "text",
        source: "shopName",
        x: CENTER,
        y: cursor + 96,
        size: 20,
        weight: 600,
        color: "ink",
        align: "middle",
        maxChars: 30,
      }
    );
    cursor += 132;
  } else if (spec.showsProduct) {
    slots.push({
      kind: "image",
      source: "productImage",
      x: CENTER - 90,
      y: cursor,
      width: 180,
      height: 180,
      radius: spec.layout === "photo" ? 90 : 28,
      fallbackGlyph: "🍛",
      ring: { color: "surface", width: 6 },
    });
    cursor += 206;
    slots.push(
      { kind: "text", source: "productName", x: CENTER, y: cursor, size: 30, weight: 700, color: "ink", align: "middle", maxChars: 24 },
      { kind: "text", source: "shopName", x: CENTER, y: cursor + 26, size: 16, weight: 500, color: "muted", align: "middle", maxChars: 32 }
    );
    cursor += 52;
    slots.push(
      { kind: "badge", source: "price", x: CENTER - 118, y: cursor, height: 34, paddingX: 14, size: 16, fill: "brand", color: "brandContrast", icon: "tag" },
      { kind: "badge", source: "rating", format: "{}", x: CENTER + 14, y: cursor, height: 34, paddingX: 14, size: 16, fill: "accentSoft", color: "ink", icon: "star" }
    );
    cursor += 58;
  } else if (spec.showsOrder) {
    slots.push(
      {
        kind: "text",
        source: "static",
        value: spec.type === "PICKUP" ? "Pickup" : spec.type === "DELIVERY" ? "Delivery" : "Order",
        x: CENTER,
        y: cursor,
        size: 16,
        weight: 600,
        color: "muted",
        align: "middle",
        uppercase: true,
        tracking: 4,
      },
      {
        kind: "text",
        source: "orderNumber",
        format: "#{}",
        value: "—",
        x: CENTER,
        y: cursor + 52,
        size: 52,
        weight: 800,
        color: "brand",
        align: "middle",
        hideWhenEmpty: false,
      },
      { kind: "text", source: "shopName", x: CENTER, y: cursor + 82, size: 18, weight: 600, color: "ink", align: "middle", maxChars: 30 }
    );
    cursor += 108;
    slots.push({
      kind: "badge",
      source: "orderStatus",
      x: CENTER - 70,
      y: cursor,
      height: 34,
      paddingX: 16,
      size: 15,
      fill: "accentSoft",
      color: "ink",
      icon: spec.type === "DELIVERY" ? "bike" : spec.type === "PICKUP" ? "bag" : "check",
    });
    cursor += 56;
  } else {
    // SHOP / MENU / EXPLORE — vendor identity, or platform copy for Explore.
    if (spec.type !== "EXPLORE") {
      slots.push({
        kind: "image",
        source: "shopLogo",
        x: CENTER - 52,
        y: cursor,
        width: 104,
        height: 104,
        radius: spec.layout === "photo" ? 52 : 24,
        fallbackGlyph: "🍽️",
        ring: { color: "surface", width: 5 },
      });
      cursor += 128;
      slots.push(
        { kind: "text", source: "shopName", x: CENTER, y: cursor, size: 30, weight: 700, color: "ink", align: "middle", maxChars: 24 },
        { kind: "text", source: "shopCategory", x: CENTER, y: cursor + 26, size: 16, weight: 500, color: "muted", align: "middle", maxChars: 34 }
      );
      cursor += 56;
    } else {
      slots.push(
        { kind: "decor", motif: "sparkle", x: CENTER - 18, y: cursor - 8, size: 36, color: "accent" },
        { kind: "text", source: "subtitle", value: "Let us surprise you", x: CENTER, y: cursor + 68, size: 20, weight: 600, color: "muted", align: "middle" }
      );
      cursor += 96;
    }
  }

  // ── QR block ───────────────────────────────────────────────────────────────
  // Fit the code to whatever vertical room the subject block left, so a tall product card
  // shrinks its QR rather than colliding with the CTA.
  const roomForQr = H - 152 - (cursor + 24);
  const qrSize = Math.max(210, Math.min(preferredQr, roomForQr));
  const qrX = (W - qrSize) / 2;
  const qrY = Math.min(Math.max(cursor + 24, 288), H - 152 - qrSize);
  slots.push({
    kind: "qr",
    x: qrX,
    y: qrY,
    size: qrSize,
    foreground: "qrModule",
    plate: { padding: 22, radius: 28, fill: "surface", shadow: true },
    frame:
      spec.layout === "ticket" || spec.layout === "poster"
        ? { color: "brand", inset: 34, length: 40, width: 5, radius: 16 }
        : undefined,
    moduleRounding: spec.qrRounding ?? 0,
    centreLogo: true,
  });

  // ── CTA + footer ───────────────────────────────────────────────────────────
  const ctaY = qrY + qrSize + 62;
  slots.push({
    kind: "rect",
    x: CENTER - 150,
    y: ctaY - 30,
    width: 300,
    height: 54,
    radius: 27,
    fill: "brand",
  });
  slots.push({
    kind: "text",
    source: "cta",
    value: spec.cta,
    x: CENTER,
    y: ctaY,
    size: 21,
    weight: 700,
    color: "brandContrast",
    align: "middle",
    hideWhenEmpty: false,
  });

  slots.push(...platformFooter(H - 40));

  // ── Decoration ─────────────────────────────────────────────────────────────
  if (spec.decor && spec.decor !== "none") {
    slots.push(
      { kind: "decor", motif: spec.decor, x: 44, y: H - 190, size: 54, rotate: -18, color: "accent", opacity: 0.5 },
      { kind: "decor", motif: spec.decor, x: W - 96, y: 150, size: 46, rotate: 152, color: "accent", opacity: 0.42 }
    );
  }

  return {
    id: spec.id,
    name: spec.name,
    types: [spec.type],
    print: PRINT,
    canvas: { width: W, height: H, radius: 32 },
    background:
      spec.layout === "poster"
        ? { kind: "panel", fill: "brand", panel: "paper", inset: 18, radius: 26 }
        : spec.layout === "photo"
          ? { kind: "gradient", from: p.paper, to: p.accentSoft, angle: 160 }
          : { kind: "solid", fill: "paper" },
    palette: p,
    slots,
    description: spec.description,
  };
}

const SPECS: CardSpec[] = [
  // ── TABLE ────────────────────────────────────────────────────────────────
  { id: "table-classic", name: "Classic Table Tent", type: "TABLE", palette: "cream", layout: "classic", decor: "leaf-pair", headline: "Scan to Order", cta: "Scan to Order", showsTable: true, description: "Warm cream card with leaf detail — the everyday table tent." },
  { id: "table-forest", name: "Forest Night", type: "TABLE", palette: "forest", layout: "classic", decor: "leaf", headline: "Order From Your Table", cta: "Scan to Order", showsTable: true, description: "Deep green card for evening dining rooms." },
  { id: "table-ticket", name: "Ticket Stub", type: "TABLE", palette: "linen", layout: "ticket", decor: "dots", headline: "Dine-in · Contactless", cta: "Scan to Order", showsTable: true, qrRounding: 0.25, description: "Framed corners and a stub feel, for casual counters." },
  { id: "table-poster", name: "Framed Poster", type: "TABLE", palette: "mint", layout: "poster", decor: "arc", headline: "Table Service", cta: "Scan to Order", showsTable: true, description: "Bordered panel that reads well from across a room." },
  { id: "table-banner", name: "Banner Top", type: "TABLE", palette: "amber", layout: "banner", decor: "cutlery", headline: "Scan · Order · Enjoy", cta: "Start My Order", showsTable: true, description: "Bold coloured header band with the table number below." },

  // ── SHOP ─────────────────────────────────────────────────────────────────
  { id: "shop-classic", name: "Shopfront Classic", type: "SHOP", palette: "cream", layout: "classic", decor: "leaf-pair", headline: "Visit Our Shop", cta: "Scan to View Shop", description: "Logo-led card for windows and counters." },
  { id: "shop-banner", name: "Storefront Banner", type: "SHOP", palette: "forest", layout: "banner", decor: "leaf", headline: "Order Online", cta: "Scan to View Shop", description: "Green banner header with the shop identity beneath." },
  { id: "shop-photo", name: "Soft Gradient", type: "SHOP", palette: "mint", layout: "photo", decor: "wave", headline: "Find Us Online", cta: "Scan to View Shop", qrRounding: 0.3, description: "Gradient wash with a circular logo crop." },
  { id: "shop-poster", name: "Window Poster", type: "SHOP", palette: "linen", layout: "poster", decor: "arc", headline: "Our Menu, Anytime", cta: "Scan to View Shop", description: "Framed poster sized for a shop window." },
  { id: "shop-dark", name: "Charcoal Card", type: "SHOP", palette: "charcoal", layout: "classic", decor: "sparkle", headline: "Taste the Local Best", cta: "Scan to View Shop", description: "Dark, premium card for evening venues." },

  // ── MENU ─────────────────────────────────────────────────────────────────
  { id: "menu-classic", name: "Digital Menu", type: "MENU", palette: "cream", layout: "classic", decor: "cutlery", headline: "Our Digital Menu", cta: "Scan to View Menu", description: "Straightforward menu card for tables and counters." },
  { id: "menu-banner", name: "Menu Banner", type: "MENU", palette: "forest", layout: "banner", decor: "leaf-pair", headline: "Explore Our Dishes", cta: "Scan to View Menu", description: "Green header band over the shop's identity." },
  { id: "menu-poster", name: "Menu Poster", type: "MENU", palette: "amber", layout: "poster", decor: "steam", headline: "Freshly Served", cta: "Scan to View Menu", description: "Warm framed poster with steam detail." },
  { id: "menu-mint", name: "Mint Minimal", type: "MENU", palette: "mint", layout: "compact", decor: "none", headline: "Digital Menu", cta: "Scan to View Menu", qrRounding: 0.3, description: "Quiet, spacious layout with a rounded code." },
  { id: "menu-linen", name: "Linen Bistro", type: "MENU", palette: "linen", layout: "ticket", decor: "dots", headline: "Today's Menu", cta: "Scan to View Menu", description: "Bistro-style framed card on linen tones." },

  // ── FOOD / PRODUCT ───────────────────────────────────────────────────────
  { id: "food-classic", name: "Dish Spotlight", type: "PRODUCT", palette: "cream", layout: "classic", decor: "leaf-pair", headline: "Try This Today", cta: "Scan to Order", showsProduct: true, description: "Photo, price and rating above the code." },
  { id: "food-photo", name: "Round Photo", type: "PRODUCT", palette: "blush", layout: "photo", decor: "sparkle", headline: "Chef's Pick", cta: "Scan to Order", showsProduct: true, qrRounding: 0.3, description: "Circular food photo on a soft gradient." },
  { id: "food-poster", name: "Dish Poster", type: "PRODUCT", palette: "amber", layout: "poster", decor: "steam", headline: "Hot & Fresh", cta: "Order This Dish", showsProduct: true, description: "Framed poster for a hero dish." },
  { id: "food-dark", name: "Night Special", type: "PRODUCT", palette: "charcoal", layout: "classic", decor: "sparkle", headline: "Tonight's Special", cta: "Scan to Order", showsProduct: true, description: "Dark card that makes food photography pop." },
  { id: "food-banner", name: "Offer Banner", type: "PRODUCT", palette: "blush", layout: "banner", decor: "wave", headline: "Special Price", cta: "Grab This Deal", showsProduct: true, description: "Coloured header for promotions and discounts." },

  // ── ORDER ────────────────────────────────────────────────────────────────
  { id: "order-classic", name: "Order Slip", type: "ORDER", palette: "cream", layout: "classic", decor: "none", headline: "Order Verification", cta: "Scan to Verify", showsOrder: true, description: "Clean verification slip for staff to scan." },
  { id: "order-ticket", name: "Kitchen Ticket", type: "ORDER", palette: "linen", layout: "ticket", decor: "dots", headline: "Order Ticket", cta: "Scan to Verify", showsOrder: true, description: "Framed ticket styling for the pass." },
  { id: "order-dark", name: "Counter Dark", type: "ORDER", palette: "charcoal", layout: "compact", decor: "none", headline: "Verify This Order", cta: "Scan to Verify", showsOrder: true, description: "High-contrast card for busy counters." },

  // ── PICKUP ───────────────────────────────────────────────────────────────
  { id: "pickup-classic", name: "Pickup Slip", type: "PICKUP", palette: "amber", layout: "classic", decor: "none", headline: "Ready for Pickup", cta: "Scan to Collect", showsOrder: true, description: "Amber slip for the collection point." },
  { id: "pickup-banner", name: "Pickup Banner", type: "PICKUP", palette: "linen", layout: "banner", decor: "none", headline: "Skip the Line", cta: "Scan to Collect", showsOrder: true, description: "Header band for pickup shelves." },
  { id: "pickup-poster", name: "Collection Poster", type: "PICKUP", palette: "cream", layout: "poster", decor: "arc", headline: "Collection Point", cta: "Scan to Collect", showsOrder: true, description: "Framed sign for a pickup counter." },

  // ── DELIVERY ─────────────────────────────────────────────────────────────
  { id: "delivery-classic", name: "Delivery Slip", type: "DELIVERY", palette: "sky", layout: "classic", decor: "none", headline: "Delivery Verification", cta: "Scan to Confirm", showsOrder: true, description: "Blue slip attached to the delivery bag." },
  { id: "delivery-banner", name: "Delivery Banner", type: "DELIVERY", palette: "sky", layout: "banner", decor: "wave", headline: "Safe Delivery", cta: "Scan to Confirm", showsOrder: true, description: "Header band for courier handover." },
  { id: "delivery-compact", name: "Courier Compact", type: "DELIVERY", palette: "charcoal", layout: "compact", decor: "none", headline: "Confirm Delivery", cta: "Scan to Confirm", showsOrder: true, description: "Small, high-contrast label for bags." },

  // ── EXPLORE ──────────────────────────────────────────────────────────────
  { id: "explore-classic", name: "Surprise Me", type: "EXPLORE", palette: "mint", layout: "classic", decor: "sparkle", headline: "Not Sure What to Eat?", cta: "Scan to Explore", description: "Discovery card for tables and noticeboards." },
  { id: "explore-poster", name: "Discovery Poster", type: "EXPLORE", palette: "cream", layout: "poster", decor: "leaf-pair", headline: "Find Your Next Meal", cta: "Scan to Explore", description: "Framed poster for shared spaces." },
  { id: "explore-dark", name: "Night Discovery", type: "EXPLORE", palette: "forest", layout: "photo", decor: "sparkle", headline: "Hungry? Let Us Pick.", cta: "Scan to Explore", qrRounding: 0.3, description: "Deep green discovery card for evenings." },
];

/** All templates, keyed by id. */
export const QR_TEMPLATES: Record<string, QrTemplate> = Object.fromEntries(
  SPECS.map((spec) => [spec.id, buildTemplate(spec)])
);

export const QR_TEMPLATE_LIST: QrTemplate[] = Object.values(QR_TEMPLATES);

export function templatesForType(type: string): QrTemplate[] {
  return QR_TEMPLATE_LIST.filter((t) => t.types.includes(type as QrCardType));
}

export function defaultTemplateId(type: string): string | null {
  return templatesForType(type)[0]?.id ?? null;
}

export function getTemplate(id: string | null | undefined, type: string): QrTemplate | null {
  if (id && QR_TEMPLATES[id]) return QR_TEMPLATES[id];
  const fallback = defaultTemplateId(type);
  return fallback ? QR_TEMPLATES[fallback] : null;
}
