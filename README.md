# Foodivo

A QR-first, multi-vendor local food marketplace: customers discover nearby shops and
order for delivery, pickup, or dine-in (via table QR); shop owners run their menu,
tables, and orders from a vendor dashboard; admins approve shops and manage the
platform's QR/location layer.

This is the **core-loop build** — see "Scope" below for exactly what's real vs
deferred. It was scoped down from a much larger 94-section spec; the cut was
deliberate and disclosed, not a shortcut discovered along the way.

## Run it locally

```bash
npm install
cp .env.example .env   # then edit JWT_SECRET for anything beyond local dev
npm run db:push
npm run db:seed
npm run dev
```

Runs on **http://localhost:4410** (pinned port — see `package.json`).

### Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@foodivo.demo` | `admin123` |
| Vendor (Anwar's Kitchen) | `owner-anwars-kitchen@foodivo.demo` | `vendor123` |
| Vendor (Golden Wok Stall) | `owner-golden-wok-stall@foodivo.demo` | `vendor123` |
| Vendor (Riverside Café) | `owner-riverside-cafe@foodivo.demo` | `vendor123` |
| Vendor (Fresh Press Juice Bar — starts **PENDING**, for the admin approval demo) | `owner-fresh-press@foodivo.demo` | `vendor123` |

Customers don't need an account — guest checkout works for all three order modes.

## Walking the QR-first flow

1. Sign in as `owner-anwars-kitchen@...` → `/vendor/tables` → open a table's QR → copy its
   URL (or `/vendor/qr` for the shop's own QR).
2. Open that URL as a customer (logged out, or a different browser/incognito) — it
   auto-detects the shop + table and locks the order into dine-in, no manual entry.
3. Add items, checkout (payment is a ~1s mock, always succeeds), land on the order
   confirmation page with its own QR.
4. Back as the vendor: `/vendor/orders` (or `/vendor/kitchen` for the large-card view) —
   Accept → Start Preparing → Mark Ready.
5. Scan the *order's* QR while signed in as staff of that shop (`/q/<order-qr-token>`) —
   it resolves to an inline staff-verification panel instead of the customer view, with a
   "Mark Collected" action.

## Walking Explore (the "what should I eat?" quiz)

1. From the homepage, tap the **Explore** banner (or go to `/discover`).
2. Answer budget / people / mood / order-type — each tap advances automatically, no
   "Next" button. Skips the location step entirely when there's only one seeded location.
3. **Choose This** goes to that product's detail page (options/add-ons still apply,
   normal add-to-cart flow from there); **Pass** gets another pick that excludes
   everything already shown this session.
4. Vendor-side: `/vendor/storefront` → toggle a shop's *Include my shop in Explore*, or a
   product's *Discoverable* checkbox, to opt in/out. `/vendor` overview shows a simple
   shown/selected/ordered count once your food has been surfaced at least once.

## Walking reviews and local image uploads

1. Complete an order end-to-end (see the QR flow above) and mark it **Collected**/
   Completed on the vendor side.
2. As the customer who placed it, open `/orders/[id]` — a review composer appears per
   order item (verified-purchase only: you must be the customer on a COMPLETED order
   containing that item). Star rating + text required; photos/video optional via the same
   local-device uploader used everywhere else in the app (drag-drop or tap to browse —
   never a paste-a-URL field). One review per order item, enforced in the DB.
3. Reviews show on the product page (`ReviewList`) with helpful votes and, once a vendor
   responds from `/vendor/reviews`, an inline vendor reply.
4. The upload component itself (`components/ui/MediaUploader.tsx`) and the vendor's
   reusable media library (`/vendor/storefront` → any image field → "Choose existing")
   are shared by shop logos/banners, product photos, and review media — one upload
   pipeline (`lib/media/save.ts`), not three.

## Walking the Shop Builder ("Customize My Shop")

1. Sign in as any `owner-*@foodivo.demo` (owner role only — staff can't reach this
   page) → `/vendor/storefront`.
2. Upload a logo/banner, pick a theme preset (or a custom accent color — colors too pale
   for readable button text are rejected on save), toggle which optional sections show
   above your menu, mark products **Featured**.
3. **Save Draft** persists your changes without customers seeing them; **Publish
   Changes** copies the draft onto the live shop and logs a `ShopRevision` snapshot.
   **View My Shop** opens the real public page in a new tab.
4. `/vendor/discounts` manages shop-wide promo codes (percent/fixed, min order, usage
   limit, date range) — per-item discounts are just a product's `discountPrice` field in
   `/vendor/menu`, already shown with a strikethrough on the customer side.

## Scope

**Fully built**: customer discovery/search/shop pages/product detail, single-shop cart,
delivery + pickup + dine-in checkout, a real `PaymentService` abstraction behind a mock
provider (swap-ready, see `lib/payment/`), order confirmation + live-polling tracking,
the full QR system (secure-token generation, `/q/[token]` resolver covering every QR
type from the spec, an in-app camera scanner via `jsqr`, staff order-QR verification, and
every QR — regardless of type or which shop it belongs to — rendered through one
platform-branded `<QRCard />` component that a vendor's own shop theme can never
override, see Architecture below), vendor dashboard (Kanban order board, a large-card
Kitchen Display view, menu/category management, table + QR management with print/
download, light staff invites), a lighter admin pass (shop approval queue, platform QR
overview, location management, overview stats), a vendor **Shop Builder** (logo/banner
upload, theme presets with a contrast-safety check, optional storefront sections,
featured products, draft/publish with revision history) and shop-wide discount
management, **Explore** — a budget/people/mood/order-type quiz feeding a
rating-weighted-but-still-random recommendation engine with pass/choose, session-scoped
no-repeat, and lightweight shown/clicked/ordered event logging, a **universal local-device
image/video upload system** used identically for shop logos/banners, product photos, and
review media (drag-drop, local disk storage behind a swappable `lib/media/save.ts`, a
reusable media-library picker so a vendor can reuse an image instead of re-uploading —
Image URL is never offered as the primary input anywhere), and the **customer review
system** (verified-purchase-only, one review per order item, star + text + photo/video,
helpful votes, vendor responses, a `status` field ready for moderation).

**Schema-complete, UI-deferred** (so nothing here blocks the feature later — see the
model comments in `prisma/schema.prisma`): delivery-courier tracking, notifications
(persisted + console-logged via `lib/notifications/`, no real push/SMS/email provider
wired), cross-device cart persistence (cart is client-side/localStorage for this pass),
audit log (written on every admin shop-status change, no viewer UI yet), review/image
moderation (`Review.status` and `Media.status` both default to an approved-equivalent
value with the field ready to gate on, no admin moderation queue UI).

**Not attempted this pass**: full analytics dashboards/charts (Explore and QR both log
real events; only simple counts are surfaced, not funnels/charts), multi-branch shops,
inventory depth beyond available/sold-out, PWA installability, SEO polish beyond page
titles, real geolocation/distance-based filtering in Explore (no lat/lng on shops —
"location" there is the existing food-court `Location` model, not GPS), image
cropping/multi-size optimization (uploads are stored as-is on local disk, see
`lib/vendor/media.ts`), video transcoding/compression (stored as uploaded, size-capped
only), drag-and-drop reordering anywhere (simple toggles/buttons instead), the 11-step
onboarding wizard (replaced with a completion-percent checklist on the vendor Overview
page, spec's own Section 117 alternative), dark mode, and SVG/PDF QR export (PNG
download/print only).

## Architecture

- **Stack**: Next.js 14 App Router + TypeScript, Prisma + SQLite (swap the
  `datasource` block for Postgres later — nothing else depends on it), Tailwind + a
  handful of Radix primitives, `qrcode` + `jsqr` for generation/scanning, `zod` for
  input validation.
- **Auth**: custom — bcrypt password hashes, a JWT session cookie signed/verified with
  `jose` (Edge-safe, so `middleware.ts` can gate `/vendor/*` and `/admin/*` without a
  Node runtime). See `lib/auth.ts`. Not NextAuth/Auth.js, deliberately — see that file's
  header comment for why.
- **QR security**: every printed/rendered QR encodes only `/q/<random-token>` — never an
  internal ID, never PII (`lib/qr/token.ts`, `lib/qr/resolve.ts`). A dine-in order's
  table is *re-resolved from the token server-side at order-creation time*, every time —
  a client can never submit an arbitrary `tableId` (see `lib/orders/createOrder.ts`).
- **Payments**: `lib/payment/PaymentService.ts` is the interface; checkout and the
  `/api/payments/*` routes only ever call it. `MockPaymentProvider.ts` is today's
  implementation — replace it with a real gateway (SSLCommerz/ShurjoPay/etc.) without
  touching checkout.
- **Idempotency**: checkout generates one `idempotencyKey` client-side and holds it
  through retries; `Order.idempotencyKey` is DB-unique, so a double-tapped "Pay" returns
  the original order instead of creating a second one.
- **Status constants**: SQLite's Prisma connector doesn't support native enums, so every
  status/type field is a plain `String` column — the authoritative value lists live in
  `lib/constants.ts` (this doubles as the spec's "centralized status constants"
  requirement).
- **Brand config**: `lib/brand.ts` centralizes `MAIN_PLATFORM_NAME`,
  `MAIN_PLATFORM_LOGO`, and `MAIN_PLATFORM_PRIMARY_COLOR` — swap in a real name/logo/
  color here once they exist, nothing else needs to change. The default palette is a
  green/cream/charcoal scheme (`app/globals.css`), with orange/red reserved for
  discounts/alerts and blue reserved for delivery/tracking/info, never used as the
  primary brand color.
- **Platform-branded QR cards**: `components/qr/QRCard.tsx` (on-screen) and the matching
  hand-built HTML in `QrCenter.tsx`'s `printQr()` (print window — a separate window can't
  render the live React tree) are the only two places a QR is ever rendered. Both always
  pull from `lib/brand.ts`, never from a shop's `ShopThemeProvider` scope, so a customer
  can trust that any QR carrying the platform logo/footer is genuine regardless of which
  vendor generated it.

## Project structure

```
app/
  (customer)/       home, explore, discover (quiz), shop/product pages, cart,
                     checkout, orders, scan, auth
  vendor/           owner/staff dashboard incl. storefront/discounts (role-guarded)
  admin/            platform admin (role-guarded via middleware.ts)
  api/               every route above, grouped by resource
  q/[token]/         the QR resolver
components/
  ui/               small design-system primitives (Button, Card, Dialog, Tabs, ...)
  customer/ vendor/ admin/   feature components per surface
lib/
  auth.ts constants.ts prisma.ts brand.ts utils.ts
  payment/          PaymentService interface + mock implementation
  qr/               token generation + server-side resolution
  notifications/    NotificationService interface + console/DB implementation
  cart/             client-side cart store (Zustand + localStorage)
  orders/           createOrder — the one place an order gets created
  storefront/       theme presets + contrast-safety check for the shop builder
  vendor/           media upload (local disk) + shop-access authz helpers
  validation/        zod schemas
prisma/
  schema.prisma seed.ts
public/uploads/     vendor-uploaded logos/banners (gitignored, runtime data)
```
