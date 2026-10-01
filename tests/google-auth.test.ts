import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_BASE_URL = "https://shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_BUSINESS_URL = "https://business.shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.shokherkhabar.arnayem.top";
process.env.GOOGLE_CLIENT_ID = "test-client";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.JWT_SECRET = "google-flow-test-secret";

const modules = Promise.all([
  import("../app/api/auth/google/route"),
  import("../app/api/auth/google/callback/route"),
  import("../lib/prisma"),
  import("../lib/auth"),
  import("../middleware"),
]);

function request(host: string, path: string, cookie = "") {
  // Production proxy preserves Host while Next sees an internal bind URL.
  return new NextRequest(`http://localhost:4410${path}`, { headers: { host, cookie } });
}

for (const [host, role, next] of [
  ["admin.shokherkhabar.arnayem.top", "ADMIN", "/admin/shops"],
  ["shokherkhabar.arnayem.top", "CUSTOMER", "/orders"],
]) {
  test(`Google sign-in completes on initiating ${host} with a usable host-local session`, async (t) => {
    const [start, callback, { prisma }, auth, { middleware }] = await modules;
    const redirectUri = `https://${host}/api/auth/google/callback`;
    const findFirst = prisma.user.findFirst;
    prisma.user.findFirst = (async () => ({
      id: "user-1", name: "Test User", email: "test@example.com", googleId: "google-1",
      imageUrl: null, phone: null, passwordHash: null, dateOfBirth: null,
      createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), role, shopStaff: [],
    })) as unknown as typeof findFirst;
    t.after(() => { prisma.user.findFirst = findFirst; });
    t.mock.method(globalThis, "fetch", async (url: string, options?: RequestInit) => {
      if (url === "https://oauth2.googleapis.com/token") {
        assert.equal(new URLSearchParams(options?.body as URLSearchParams).get("redirect_uri"), redirectUri);
        return Response.json({ access_token: "test-access-token" });
      }
      assert.equal(url, "https://openidconnect.googleapis.com/v1/userinfo");
      return Response.json({ sub: "google-1", email: "test@example.com", email_verified: true, name: "Test User" });
    });

    const initiated = await start.GET(request(host, `/api/auth/google?next=${encodeURIComponent(next)}`));
    const authorize = new URL(initiated.headers.get("location")!);
    assert.equal(authorize.searchParams.get("redirect_uri"), redirectUri);
    const state = initiated.cookies.get("shokherkhabar_oauth_state")!;
    assert.equal(authorize.searchParams.get("state"), state.value);
    assert.equal(state.httpOnly, true);
    assert.equal(state.sameSite, "lax");
    assert.equal(state.secure, true);
    assert.equal(state.domain, undefined);
    const cookie = initiated.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    const completed = await callback.GET(request(host, `/api/auth/google/callback?code=test-code&state=${state.value}`, cookie));
    assert.equal(completed.headers.get("location"), `https://${host}${next}`);
    const session = completed.cookies.get(auth.SESSION_COOKIE_NAME)!;
    assert.equal(session.domain, undefined);
    assert.equal((await auth.verifySessionToken(session.value))?.role, role);
    assert.equal(completed.cookies.get(state.name)?.value, "");
    assert.equal((await middleware(request(host, next, `${session.name}=${session.value}`))).headers.get("x-middleware-next"), "1");
  });
}

test("admin callback rejects missing/mismatched state before redeeming a code", async (t) => {
  const [, callback] = await modules;
  t.mock.method(globalThis, "fetch", async () => { assert.fail("Invalid state must not reach Google"); });
  for (const cookie of ["", "shokherkhabar_oauth_state=other"]) {
    const response = await callback.GET(request("admin.shokherkhabar.arnayem.top", "/api/auth/google/callback?code=test-code&state=state", cookie));
    assert.equal(response.headers.get("location"), "https://admin.shokherkhabar.arnayem.top/login?error=google_state");
    assert.equal(response.cookies.get("shokherkhabar_session"), undefined);
  }
});

test("unavailable Google login stays on the admin hostname", async () => {
  const [start] = await modules;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    assert.equal((await start.GET(request("admin.shokherkhabar.arnayem.top", "/api/auth/google"))).headers.get("location"), "https://admin.shokherkhabar.arnayem.top/login?error=google_unavailable");
  } finally { process.env.GOOGLE_CLIENT_SECRET = secret; }
});

test("unknown hosts canonicalize before issuing state and cannot redeem callbacks", async (t) => {
  const [start, callback] = await modules;
  t.mock.method(globalThis, "fetch", async () => { assert.fail("Unknown hosts must not redeem codes"); });
  const initiated = await start.GET(request("attacker.example", "/api/auth/google?next=%2Forders"));
  assert.equal(initiated.headers.get("location"), "https://shokherkhabar.arnayem.top/api/auth/google?next=%2Forders");
  assert.equal(initiated.cookies.get("shokherkhabar_oauth_state"), undefined);
  const completed = await callback.GET(request("attacker.example", "/api/auth/google/callback?code=x&state=x", "shokherkhabar_oauth_state=x"));
  assert.equal(completed.headers.get("location"), "https://shokherkhabar.arnayem.top/login?error=google_state");
});

test("business OAuth endpoints retain the separate vendor sign-in", async () => {
  const [start, callback] = await modules;
  for (const route of [start, callback]) {
    const response = await route.GET(request("business.shokherkhabar.arnayem.top", "/api/auth/google"));
    assert.equal(response.headers.get("location"), "https://business.shokherkhabar.arnayem.top/vendor/login");
    assert.equal(response.cookies.get("shokherkhabar_oauth_state"), undefined);
  }
});

test("OAuth return path cannot escape the initiating origin via backslashes", async () => {
  const [start] = await modules;
  const response = await start.GET(request("admin.shokherkhabar.arnayem.top", "/api/auth/google?next=" + encodeURIComponent("/\\attacker.example")));
  assert.ok(!response.cookies.get("shokherkhabar_oauth_next")?.value);
});
