import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_BASE_URL = "https://shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_BUSINESS_URL = "https://business.shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.shokherkhabar.arnayem.top";

const hostsPromise = import("../lib/hosts");

test("classifies each configured production hostname", async () => {
  const hosts = await hostsPromise;
  assert.equal(hosts.classifyHost("shokherkhabar.arnayem.top"), "customer");
  assert.equal(hosts.classifyHost("business.shokherkhabar.arnayem.top"), "business");
  assert.equal(hosts.classifyHost("admin.shokherkhabar.arnayem.top"), "admin");
});

test("normalizes case and preserves explicit ports", async () => {
  const hosts = await hostsPromise;
  assert.equal(hosts.classifyHost("ADMIN.SHOKHERKHABAR.ARNAYEM.TOP"), "admin");
  assert.equal(hosts.classifyHost("localhost:4410"), "customer");
  assert.equal(hosts.classifyHost("admin.shokherkhabar.arnayem.top:4410"), "customer");
});

test("keeps legacy predicates available", async () => {
  const hosts = await hostsPromise;
  assert.equal(hosts.isBusinessHost("business.shokherkhabar.arnayem.top"), true);
  assert.equal(hosts.isAdminHost("admin.shokherkhabar.arnayem.top"), true);
  assert.equal(hosts.isBusinessHost("admin.shokherkhabar.arnayem.top"), false);
  assert.equal(hosts.isAdminHost("business.shokherkhabar.arnayem.top"), false);
});

test("falls back to customer for absent and unknown hosts", async () => {
  const hosts = await hostsPromise;
  for (const host of [null, undefined, "", "unconfigured.example"]) {
    assert.equal(hosts.classifyHost(host), "customer");
  }
});

test("returns each configured public origin", async () => {
  const hosts = await hostsPromise;
  assert.equal(hosts.originFor("customer"), "https://shokherkhabar.arnayem.top");
  assert.equal(hosts.originFor("business"), "https://business.shokherkhabar.arnayem.top");
  assert.equal(hosts.originFor("admin"), "https://admin.shokherkhabar.arnayem.top");
  assert.equal(hosts.ADMIN_ORIGIN, "https://admin.shokherkhabar.arnayem.top");
});
