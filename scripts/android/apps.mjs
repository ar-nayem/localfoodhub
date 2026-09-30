import { fileURLToPath } from "node:url";

/** Canonical identities and absolute, working-directory-independent source/output paths. */
export const ANDROID_APPS = Object.freeze([
  { key: "customer", name: "শখের খাবার", packageId: "top.arnayem.shokherkhabar", host: "shokherkhabar.arnayem.top", startUrl: "/" },
  { key: "business", name: "শখের খাবার Business", packageId: "top.arnayem.shokherkhabar.business", host: "business.shokherkhabar.arnayem.top", startUrl: "/vendor" },
  { key: "admin", name: "শখের খাবার Admin", packageId: "top.arnayem.shokherkhabar.admin", host: "admin.shokherkhabar.arnayem.top", startUrl: "/admin" },
].map((app) => Object.freeze({
  ...app,
  manifestPath: fileURLToPath(new URL(`../../android/${app.key}/twa-manifest.json`, import.meta.url)),
  projectDir: fileURLToPath(new URL(`../../android/${app.key}/generated/`, import.meta.url)),
})));
