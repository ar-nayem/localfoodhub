import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { execFileSync } from "node:child_process";
process.env.NEXT_PUBLIC_BASE_URL = "https://shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_BUSINESS_URL = "https://business.shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.shokherkhabar.arnayem.top";
process.env.JWT_SECRET = "host-routing-test-secret";

const routingPromise = import("../lib/hostRouting");
const middlewarePromise = import("../middleware");

function request(host: string, path: string, cookie?: string, origin = "http://localhost:4410") {
  return new NextRequest(`${origin}${path}`, {
    headers: { host, ...(cookie ? { cookie } : {}) },
  });
}

async function tokenFor(role: string, expires = "1h", secret = "host-routing-test-secret") {
  return new SignJWT({ role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(expires)
    .sign(new TextEncoder().encode(secret));
}

test("assigns protected areas to their applications", async () => {
  const { canonicalSurface } = await routingPromise;
  assert.equal(canonicalSurface("/vendor/orders"), "business");
  assert.equal(canonicalSurface("/q/token"), "business");
  assert.equal(canonicalSurface("/admin/shops"), "admin");
  assert.equal(canonicalSurface("/s/anwars-kitchen"), "customer");
});

test("keeps legal and account-removal pages shared", async () => {
  const { canonicalSurface } = await routingPromise;
  assert.equal(canonicalSurface("/privacy"), "shared");
  assert.equal(canonicalSurface("/terms"), "shared");
  assert.equal(canonicalSurface("/delete-account"), "shared");
});

test("matches route roots and descendants without catching similar prefixes", async () => {
  const { canonicalSurface } = await routingPromise;
  for (const path of ["/vendor", "/q"]) assert.equal(canonicalSurface(path), "business");
  assert.equal(canonicalSurface("/admin"), "admin");
  for (const path of ["/vendors", "/queue", "/administrator", "/privacy-policy", "/"]) {
    assert.equal(canonicalSurface(path), "customer");
  }
  assert.equal(canonicalSurface("/privacy/details"), "shared");
});

test("keeps login host-local so admin authentication sets an admin-host cookie", async () => {
  const { canonicalSurface, canonicalLocation } = await routingPromise;
  assert.equal(canonicalSurface("/login"), "shared");
  assert.equal(canonicalLocation("admin", "/login", "?next=%2Fadmin"), null);
  assert.equal(canonicalLocation("customer", "/login", "?next=%2Forders"), null);
});

test("preserves query strings in canonical cross-surface locations", async () => {
  const { canonicalLocation } = await routingPromise;
  assert.equal(canonicalLocation("customer", "/vendor/orders", "?status=NEW"), "https://business.shokherkhabar.arnayem.top/vendor/orders?status=NEW");
  assert.equal(canonicalLocation("customer", "/q/token", "?source=scan"), "https://business.shokherkhabar.arnayem.top/q/token?source=scan");
  assert.equal(canonicalLocation("business", "/admin/shops", "?page=2"), "https://admin.shokherkhabar.arnayem.top/admin/shops?page=2");
  assert.equal(canonicalLocation("admin", "/s/anwars-kitchen", "?menu=lunch"), "https://shokherkhabar.arnayem.top/s/anwars-kitchen?menu=lunch");
});

test("avoids redirects for canonical and shared pages", async () => {
  const { canonicalLocation } = await routingPromise;
  assert.equal(canonicalLocation("business", "/vendor/orders", ""), null);
  assert.equal(canonicalLocation("admin", "/admin/shops", ""), null);
  assert.equal(canonicalLocation("customer", "/s/anwars-kitchen", ""), null);
  for (const surface of ["customer", "business", "admin"] as const) {
    for (const path of ["/privacy", "/terms", "/delete-account"]) {
      assert.equal(canonicalLocation(surface, path, "?from=app"), null);
    }
  }
});

test("routes application roots and business public aliases locally", async () => {
  const { canonicalLocation } = await routingPromise;
  assert.equal(canonicalLocation("business", "/", "?from=app"), "/vendor?from=app");
  assert.equal(canonicalLocation("admin", "/", "?from=app"), "/admin?from=app");
  assert.equal(canonicalLocation("customer", "/", ""), null);
  assert.equal(canonicalLocation("business", "/login", "?next=%2Fvendor"), "/vendor/login?next=%2Fvendor");
  assert.equal(canonicalLocation("business", "/apply", "?ref=qr"), "/vendor/apply?ref=qr");
  assert.equal(canonicalLocation("customer", "/apply", "?ref=qr"), "https://business.shokherkhabar.arnayem.top/vendor/apply?ref=qr");
});

test("middleware routes all protected surfaces before checking their sessions", async () => {
  const { middleware } = await middlewarePromise;
  const cases = [
    ["shokherkhabar.arnayem.top", "/admin/shops?page=2", "https://admin.shokherkhabar.arnayem.top/admin/shops?page=2"],
    ["shokherkhabar.arnayem.top", "/q/token?from=scan", "https://business.shokherkhabar.arnayem.top/q/token?from=scan"],
    ["business.shokherkhabar.arnayem.top", "/admin/shops", "https://admin.shokherkhabar.arnayem.top/admin/shops"],
    ["admin.shokherkhabar.arnayem.top", "/vendor/orders", "https://business.shokherkhabar.arnayem.top/vendor/orders"],
    ["admin.shokherkhabar.arnayem.top", "/s/anwars-kitchen?menu=lunch", "https://shokherkhabar.arnayem.top/s/anwars-kitchen?menu=lunch"],
  ];
  for (const [host, path, location] of cases) {
    const response = await middleware(request(host, path));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), location);
  }
});

test("middleware resolves local redirects against the public host behind a proxy", async () => {
  const { middleware } = await middlewarePromise;
  const cases = [
    ["business.shokherkhabar.arnayem.top", "/?from=app", "https://business.shokherkhabar.arnayem.top/vendor?from=app"],
    ["admin.shokherkhabar.arnayem.top", "/?from=app", "https://admin.shokherkhabar.arnayem.top/admin?from=app"],
    ["business.shokherkhabar.arnayem.top", "/login?next=%2Fvendor", "https://business.shokherkhabar.arnayem.top/vendor/login?next=%2Fvendor"],
    ["business.shokherkhabar.arnayem.top", "/apply?ref=qr", "https://business.shokherkhabar.arnayem.top/vendor/apply?ref=qr"],
  ];
  for (const [host, path, location] of cases) {
    const response = await middleware(request(host, path));
    assert.equal(response.headers.get("location"), location);
  }
});

test("middleware serves shared pages and vendor public pages without a session", async () => {
  const { middleware } = await middlewarePromise;
  for (const host of ["shokherkhabar.arnayem.top", "business.shokherkhabar.arnayem.top", "admin.shokherkhabar.arnayem.top"]) {
    for (const path of ["/privacy", "/terms", "/delete-account"]) {
      assert.equal((await middleware(request(host, path))).headers.get("x-middleware-next"), "1");
    }
  }
  for (const path of ["/vendor/login", "/vendor/apply", "/q/token"]) {
    assert.equal((await middleware(request("business.shokherkhabar.arnayem.top", path))).headers.get("x-middleware-next"), "1");
  }
});

test("admin authentication redirect terminates at a local login page", async () => {
  const { middleware } = await middlewarePromise;
  const response = await middleware(request("admin.shokherkhabar.arnayem.top", "/admin/shops"));
  assert.equal(response.headers.get("location"), "https://admin.shokherkhabar.arnayem.top/login?next=%2Fadmin%2Fshops");
  const login = await middleware(request("admin.shokherkhabar.arnayem.top", "/login?next=%2Fadmin%2Fshops"));
  assert.equal(login.headers.get("x-middleware-next"), "1");
});

test("middleware preserves JWT validation, allowed roles, and all legacy session cookies", async () => {
  const { middleware } = await middlewarePromise;
  for (const name of ["shokherkhabar_session", "foodivo_session", "lfh_session"]) {
    for (const role of ["SHOP_OWNER", "SHOP_STAFF", "KITCHEN_STAFF"]) {
      const response = await middleware(request("business.shokherkhabar.arnayem.top", "/vendor/orders", `${name}=${await tokenFor(role)}`));
      assert.equal(response.headers.get("x-middleware-next"), "1");
    }
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      const response = await middleware(request("admin.shokherkhabar.arnayem.top", "/admin/shops", `${name}=${await tokenFor(role)}`));
      assert.equal(response.headers.get("x-middleware-next"), "1");
    }
  }
  for (const token of ["malformed", await tokenFor("SHOP_OWNER", "-1h"), await tokenFor("SHOP_OWNER", "1h", "wrong-secret"), await tokenFor("CUSTOMER"), await tokenFor("ADMIN")]) {
    const response = await middleware(request("business.shokherkhabar.arnayem.top", "/vendor/orders", `shokherkhabar_session=${token}`));
    assert.equal(response.headers.get("location"), "https://business.shokherkhabar.arnayem.top/vendor/login?next=%2Fvendor%2Forders");
  }
  const wrongRole = await middleware(request("admin.shokherkhabar.arnayem.top", "/admin/shops", `shokherkhabar_session=${await tokenFor("SHOP_OWNER")}`));
  assert.equal(wrongRole.headers.get("location"), "https://admin.shokherkhabar.arnayem.top/login?next=%2Fadmin%2Fshops");
});

test("middleware avoids proxy loops when a canonical target is the internal bind origin", async () => {
  const { middleware } = await middlewarePromise;
  const response = await middleware(request("business.shokherkhabar.arnayem.top", "/s/anwars-kitchen", undefined, "https://shokherkhabar.arnayem.top"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("unconfigured origins preserve single-host routing and role guards", () => {
  // Host origins are captured at import time, so exercise an isolated module graph.
  execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import assert from "node:assert/strict";
    import { NextRequest } from "next/server.js";
    const { canonicalLocation } = await import("./lib/hostRouting.ts");
    const { middleware } = await import("./middleware.ts");
    assert.equal(canonicalLocation("customer", "/admin/shops", ""), null);
    assert.equal(canonicalLocation("customer", "/vendor/orders", ""), null);
    assert.equal(canonicalLocation("customer", "/apply", ""), null);
    const response = await middleware(new NextRequest("http://localhost:4410/vendor/orders", { headers: { host: "localhost:4410" } }));
    assert.equal(response.headers.get("location"), "http://localhost:4410/vendor/login?next=%2Fvendor%2Forders");
  `], {
    env: { ...process.env, NEXT_PUBLIC_BASE_URL: "", NEXT_PUBLIC_BUSINESS_URL: "", NEXT_PUBLIC_ADMIN_URL: "" },
    stdio: "pipe",
  });
});
