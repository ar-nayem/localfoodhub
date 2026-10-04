# Checkout and vendor dashboard design QA — 2026-10-01

## Comparison target

- **Source visual truth:** `/Users/apple/.codex/generated_images/01a0ec3e-230a-7d33-86fb-9bc7b45538c2/exec-9ff64c53-6e71-4cee-b979-ba0cdec02e62.png` (the user-selected option 3 checkout concept).
- **Implementation:** `http://127.0.0.1:4410/checkout`, opened from a populated local cart in Chrome.
- **Primary implementation capture:** `docs/product-design-audit-2026-10-01/08-checkout-final.png`.
- **Combined comparison evidence:** `docs/product-design-audit-2026-10-01/09-checkout-final-comparison.png` (source on the left, implementation on the right).
- **Vendor extension evidence:** `docs/product-design-audit-2026-10-01/07-vendor-dashboard.png` at `http://127.0.0.1:4410/vendor`, signed in with disposable seeded local data.

## Normalization and state

- Source: 853 × 1844 pixels. It was scaled proportionally and padded to 390 × 844 pixels for the combined comparison.
- Implementation: 390 × 844 CSS pixels and 390 × 844 screenshot pixels at device scale factor 1.
- Checkout state: one Chicken Biryani item, pickup selected, a ৳30 promo discount, unpaid contact fields. The Schedule control was activated separately and displayed its native date/time input.
- Vendor state: active sample shop, no incoming orders, 71% setup completion.

## Fidelity review

### Fonts and typography

The implementation retains the product’s readable system font but mirrors the source hierarchy: compact brand label, bold checkout title, restrained uppercase card labels, and strong total/CTA weight. Small helper copy remains legible at mobile width with no clipped labels.

### Spacing and layout rhythm

Both views use the reference’s generous card padding, rounded grouping, two-choice controls, a short vertical handoff journey, and a persistent payment CTA. The mobile CTA stays above the customer bottom navigation. Vendor content uses a clear summary → setup → metrics → actions rhythm rather than an oversized empty dashboard.

### Colors and visual tokens

The implementation maps the reference’s deep green, soft mint selection state, white surfaces, fine gray borders, and warm off-white page background to existing product tokens. Interactive selected controls and the primary CTA preserve adequate contrast.

### Image quality and asset fidelity

The implementation uses existing product imagery when available and icon-library controls for standard interface symbols. The approved customer brand artwork is now used by the customer wordmark component; no custom SVG, CSS-drawn artwork, emoji, or placeholder art was added for the new screens.

### Copy and content

The checkout gives customers the same essential confidence signals as the source: order review, handoff selection, schedule control, payment clarity, transparent totals, and an explicit “what happens next” sequence. The vendor dashboard uses operational copy matched to real data and existing routes.

## Findings and disposition

- **Accepted product-scope difference:** The source concept has delivery selected and several payment methods. The current release only enables pickup and one secure online-payment flow. Showing unavailable delivery or payment options would mislead customers, so the implementation intentionally shows only live options. No code change is needed until those services are enabled.
- **P3:** The checkout’s product image falls back to a standard food icon when the cart item has no image. Existing cart data already supports an image URL, so this automatically improves as merchants provide product photos.

No actionable P0, P1, or P2 differences remain for the supported pickup checkout state.

## Primary interactions tested

1. Continued from a populated cart into checkout.
2. Confirmed selected pickup state and price totals.
3. Activated **Schedule** and verified that the date/time chooser appears.
4. Signed into the local vendor account and verified the redesigned dashboard, completion links, and operational action links render against live sample data.

## Implementation checklist

- [x] Customer checkout uses selected option-3 direction.
- [x] Totals, promotion, order mode, scheduling, contact fields, and order submission keep their existing behavior.
- [x] Customer-approved logo is used in the customer wordmark.
- [x] Vendor overview has redesigned hierarchy and real-data action areas.
- [x] Browser-rendered mobile and desktop evidence captured.

final result: passed

---

# Customer marketplace visual refresh design QA — 2026-10-04

## Comparison target

- **Source visual truth:** `/Users/apple/.codex/generated_images/01a0ec3e-230a-7d33-86fb-9bc7b45538c2/exec-bc48401a-d9b5-4aec-9752-74c46f1d12c4.png` (the bright boutique-market direction selected for implementation).
- **Implementation:** `https://shokherkhabar.arnayem.top/` at the deployed revision `0b919ee489bb43ea68197501807ca823b845ca21`.
- **Browser-rendered evidence:** in-app Browser captures taken after reload at the live URL: the top-state capture shows the search field, live hero, shortcut cards, food posters, and floating navigation; the listing-state capture confirms the lower marketplace content renders with the deployed service.

## Normalization and state

- Source: 853 × 1844 pixels, portrait mobile composition.
- Implementation: browser mobile viewport, content-only page capture; browser chrome excluded.
- State: anonymous customer home, live shop/product data, location control not granted a device location.

## Fidelity review

### Fonts and typography

The customer home preserves the existing readable system stack while raising hierarchy through a strong hero title, compact section titles, and consistently weighted action labels. Long item names still truncate rather than overlap.

### Spacing and layout rhythm

The live screen has a floating 56px search control, a short immersive hero, balanced four-column shortcut cards, compact poster cards, and a low-profile floating navigation dock. The two-column shop grid increases discovery density without hiding persistent controls.

### Colors and visual tokens

Warm ivory, deep green, saffron, and softened supporting tints follow the selected direction while continuing to use the platform’s semantic primary, surface, and warning colors. Interactive controls retain visible contrast.

### Image quality and asset fidelity

The live customer home uses five generated production raster assets: a biryani discovery hero, three named menu-dish artworks, and a restaurant poster. The incorrect pipe-cleaner, diploma, and food emoji visuals no longer appear on the refreshed customer-home feed. Standard operational controls use the existing accessible icon library.

### Copy and content

The working routes and customer copy remain intact: search, discovery, Food/Dine-in/Takeaway/Offers shortcuts, item links, shop links, QR ordering, cart, alerts, and navigation all remain available.

## Findings and disposition

- **P3:** The concept’s illustrated shortcut symbols are represented by the project’s accessible icon set rather than generated raster mini-illustrations. The stronger surfaces, motion, and food imagery carry the premium treatment without reducing recognizability.
- **P3:** Only the known demo dishes have dedicated artwork; other merchant-provided images continue to render as supplied. The shared fallback no longer uses emoji.

No actionable P0, P1, or P2 differences remain for the deployed customer-home state.

## Primary interactions tested

1. Reloaded the live customer homepage after the service restart.
2. Verified the search field, discovery link, four quick-access links, food-card links, shop links, and bottom navigation are present in the live accessibility tree.
3. Captured top and listing states from the deployed mobile page.

## Implementation checklist

- [x] Generated premium customer-home food artwork is served from the production app.
- [x] Generic food-emoji fallback removed from customer media handling.
- [x] Customer home uses compact shop posters and a floating bottom navigation treatment.
- [x] Production build, automated tests, PM2 restart, and live browser rendering verified.

final result: passed
