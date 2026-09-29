import assert from "node:assert/strict";
import test from "node:test";
import { assetLinkForSurface } from "../lib/android/assetlinks";

const fingerprint = "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89";
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  ANDROID_PACKAGE_NAME: "top.arnayem.shokherkhabar",
  ANDROID_SHA256_CERT_FINGERPRINTS: fingerprint,
  ANDROID_BUSINESS_PACKAGE_NAME: "top.arnayem.shokherkhabar.business",
  ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS: "12:".repeat(31) + "34",
  ANDROID_ADMIN_PACKAGE_NAME: "top.arnayem.shokherkhabar.admin",
  ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS: "56:".repeat(31) + "78",
};

for (const [surface, packageName, expectedFingerprint] of [
  ["customer", "top.arnayem.shokherkhabar", fingerprint],
  ["business", "top.arnayem.shokherkhabar.business", "12:".repeat(31) + "34"],
  ["admin", "top.arnayem.shokherkhabar.admin", "56:".repeat(31) + "78"],
] as const) {
  test(`Digital Asset Links selects only the ${surface} package and certificate`, () => {
    assert.deepEqual(assetLinkForSurface(surface, env), [{
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [expectedFingerprint],
      },
    }]);
  });
}

test("malformed fingerprints are removed while valid fingerprints survive trimming", () => {
  const result = assetLinkForSurface("customer", {
    ...env,
    ANDROID_PACKAGE_NAME: " top.arnayem.shokherkhabar ",
    ANDROID_SHA256_CERT_FINGERPRINTS: `bad,${fingerprint.toLowerCase()}, ${fingerprint} ,${"AB:".repeat(30)}AB,,${"GG:".repeat(31)}GG`,
  });
  assert.equal(result?.[0].target.package_name, "top.arnayem.shokherkhabar");
  assert.deepEqual(result?.[0].target.sha256_cert_fingerprints, [fingerprint]);
});

test("malformed or missing fingerprint lists return null", () => {
  for (const value of [undefined, "", "  ", "AB:CD", fingerprint.toLowerCase()]) {
    assert.equal(assetLinkForSurface("customer", { ...env, ANDROID_SHA256_CERT_FINGERPRINTS: value }), null);
  }
});

test("Digital Asset Links rejects malformed reverse-domain package identifiers", () => {
  for (const packageName of [undefined, "", "single", "top..app", "top.app-name", "top.1app", ".top.app", "top.app.", "top.app/name", "top.app name"]) {
    assert.equal(assetLinkForSurface("customer", { ...env, ANDROID_PACKAGE_NAME: packageName }), null, packageName);
  }
});

test("Digital Asset Links never falls back to a different configured surface", () => {
  assert.equal(assetLinkForSurface("admin", { ...env, ANDROID_ADMIN_PACKAGE_NAME: undefined }), null);
  assert.equal(assetLinkForSurface("business", { ...env, ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS: undefined }), null);
  assert.equal(assetLinkForSurface("customer", { NODE_ENV: "test" }), null);
});

test("Digital Asset Links retains multiple valid signing certificates", () => {
  assert.deepEqual(assetLinkForSurface("customer", {
    ...env,
    ANDROID_SHA256_CERT_FINGERPRINTS: `${fingerprint}, ${env.ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS}`,
  })?.[0].target.sha256_cert_fingerprints, [fingerprint, "12:".repeat(31) + "34"]);
});
