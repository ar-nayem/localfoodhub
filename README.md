# Local Food Hub

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
| Admin | `admin@localfoodhub.demo` | `admin123` |
| Vendor (Anwar's Kitchen) | `owner-anwars-kitchen@localfoodhub.demo` | `vendor123` |
| Vendor (Golden Wok Stall) | `owner-golden-wok-stall@localfoodhub.demo` | `vendor123` |
| Vendor (Riverside Café) | `owner-riverside-cafe@localfoodhub.demo` | `vendor123` |
| Vendor (Fresh Press Juice Bar — starts **PENDING**, for the admin approval demo) | `owner-fresh-press@localfoodhub.demo` | `vendor123` |

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

## Scope

**Fully built**: customer discovery/search/shop pages/product detail, single-shop cart,
delivery + pickup + dine-in checkout, a real `PaymentService` abstraction behind a mock
provider (swap-ready, see `lib/payment/`), order confirmation + live-polling tracking,
the full QR system (secure-token generation, `/q/[token]` resolver covering every QR
type from the spec, an in-app camera scanner via `jsqr`, staff order-QR verification),
vendor dashboard (Kanban order board, a large-card Kitchen Display view, menu/category
management, table + QR management with print/download, light staff invites), and a
lighter admin pass (shop approval queue, platform QR overview, location management,
overview stats).

**Schema-complete, UI-deferred** (so nothing here blocks the feature later — see the
model comments in `prisma/schema.prisma`): reviews, promotions (the `Promotion` model
and promo-code redemption *do* work end-to-end; there's just no vendor UI to *create*
one beyond the seed data), delivery-courier tracking, notifications (persisted +
console-logged via `lib/notifications/`, no real push/SMS/email provider wired),
cross-device cart persistence (cart is client-side/localStorage for this pass), audit
log (written on every admin shop-status change, no viewer UI yet).

**Not attempted this pass**: full analytics dashboards/charts, multi-branch shops,
inventory depth beyond available/sold-out, PWA installability, SEO polish beyond page
titles.

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

## Project structure

```
app/
  (customer)/       home, explore, shop/product pages, cart, checkout, orders, scan, auth
  vendor/           owner/staff dashboard (role-guarded via middleware.ts)
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
  validation/        zod schemas
prisma/
  schema.prisma seed.ts
```
