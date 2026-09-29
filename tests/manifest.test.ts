import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { manifestForSurface } from "../app/manifest";

test("each surface has a stable start URL and distinct icon directory", () => {
  const customer = manifestForSurface("customer");
  const business = manifestForSurface("business");
  const admin = manifestForSurface("admin");
  assert.equal(customer.start_url, "/");
  assert.equal(business.start_url, "/vendor");
  assert.equal(admin.start_url, "/admin");
  assert.match(String(customer.icons?.[0]?.src), /^\/icons\/icon-/);
  assert.match(String(business.icons?.[0]?.src), /^\/icons\/business\//);
  assert.match(String(admin.icons?.[0]?.src), /^\/icons\/admin\//);
  assert.notEqual(admin.name, business.name);
  assert.notEqual(admin.name, customer.name);
});

test("customer manifest preserves its existing install identity and metadata", () => {
  assert.deepEqual(manifestForSurface("customer"), {
    id: "/",
    name: "শখের খাবার",
    short_name: "শখের খাবার",
    description: "Discover local shops, order ahead, and enjoy your food your way.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF8F4",
    theme_color: "#20693F",
    lang: "en",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  });
});

test("business manifest preserves its existing install identity and shortcuts", () => {
  const shortcutIcon = [{ src: "/icons/business/icon-192.png", sizes: "192x192", type: "image/png" }];
  assert.deepEqual(manifestForSurface("business"), {
    id: "/",
    name: "শখের খাবার Business",
    short_name: "শখের Business",
    description: "Run your shop on শখের খাবার — live orders, menu, kitchen display, QR codes and reviews.",
    start_url: "/vendor",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF8F4",
    theme_color: "#20693F",
    lang: "en",
    categories: ["business", "food", "productivity"],
    icons: [
      { src: "/icons/business/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/business/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/business/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Orders", short_name: "Orders", url: "/vendor/orders", icons: shortcutIcon },
      { name: "Kitchen display", short_name: "Kitchen", url: "/vendor/kitchen", icons: shortcutIcon },
      { name: "Scan to verify", short_name: "Scan", url: "/vendor/scan", icons: shortcutIcon },
    ],
  });
});

test("admin manifest opens platform operations with its own branding and shortcuts", () => {
  const admin = manifestForSurface("admin");
  assert.equal(admin.id, "/");
  assert.equal(admin.name, "শখের খাবার Admin");
  assert.equal(admin.short_name, "শখের Admin");
  assert.equal(admin.description, "Manage শখের খাবার shops, locations, customers, finance and platform operations.");
  assert.equal(admin.scope, "/");
  assert.equal(admin.display, "standalone");
  assert.equal(admin.orientation, "any");
  assert.equal(admin.background_color, "#FAF8F4");
  assert.equal(admin.theme_color, "#20693F");
  assert.deepEqual(admin.categories, ["business", "productivity"]);
  assert.deepEqual(admin.icons, [
    { src: "/icons/admin/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/admin/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/admin/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ]);
  assert.deepEqual(admin.shortcuts?.map((shortcut) => shortcut.url), [
    "/admin/shops", "/admin/locations", "/admin/analytics",
  ]);
  for (const shortcut of admin.shortcuts ?? []) {
    assert.deepEqual(shortcut.icons, [{ src: "/icons/admin/icon-192.png", sizes: "192x192", type: "image/png" }]);
  }
});

test("admin icon assets have required dimensions and distinct artwork", () => {
  for (const [filename, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["play-store-512.png", 512],
    ["apple-touch-icon.png", 180],
  ] as const) {
    const admin = readFileSync(new URL(`../public/icons/admin/${filename}`, import.meta.url));
    assert.equal(admin.subarray(1, 4).toString(), "PNG");
    assert.equal(admin.readUInt32BE(16), size, `${filename} width`);
    assert.equal(admin.readUInt32BE(20), size, `${filename} height`);
    for (const directory of ["", "business/"]) {
      const existing = readFileSync(new URL(`../public/icons/${directory}${filename}`, import.meta.url));
      assert.notDeepEqual(admin, existing, `${filename} must be distinct from ${directory || "customer"}`);
    }
  }
});
