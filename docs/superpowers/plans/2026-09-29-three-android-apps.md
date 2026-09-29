# Three Android Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce separately installable customer, business, and admin Android apps, with signed test APKs and Play Store AABs, from the existing shared শখের খাবার web platform.

**Architecture:** The existing Next.js server becomes aware of three canonical production origins and returns host-specific routing, manifests, and Digital Asset Links metadata. Three thin Trusted Web Activity packages open those verified HTTPS origins while all product behavior, authentication, and data remain in the shared web application and database.

**Tech Stack:** Next.js 14, TypeScript, Node test runner through `tsx`, Android Trusted Web Activity, Bubblewrap CLI 1.25.0, Android Gradle tooling, Java keytool/jarsigner.

**Spec:** `docs/superpowers/specs/2026-09-29-three-android-apps-design.md`

## Global Constraints

- Customer origin: `https://shokherkhabar.arnayem.top`; start route: `/`; package: `top.arnayem.shokherkhabar`.
- Business origin: `https://business.shokherkhabar.arnayem.top`; start route: `/vendor`; package: `top.arnayem.shokherkhabar.business`.
- Admin origin: `https://admin.shokherkhabar.arnayem.top`; start route: `/admin`; package: `top.arnayem.shokherkhabar.admin`.
- App names: `শখের খাবার`, `শখের খাবার Business`, and `শখের খাবার Admin`.
- All three surfaces use the existing backend, Prisma models, and database; do not create an Android-local business database.
- Host routing is not authorization. Preserve API authorization and the existing vendor/admin role checks.
- Do not commit keystores, signing passwords, generated release binaries, Android SDKs, or build intermediates.
- Build one signed APK and one signed AAB per application.
- Bubblewrap CLI is pinned to `1.25.0` for reproducible project generation.

## File Map

- `lib/hosts.ts`: parse and classify the three configured origins.
- `lib/hostRouting.ts`: pure host/path routing policy shared by middleware and unit tests.
- `middleware.ts`: perform canonical-origin redirects and existing role enforcement.
- `lib/brand.ts`: customer, business, and admin Android/PWA branding metadata.
- `app/manifest.ts`: return the correct manifest for the request host.
- `app/api/well-known/assetlinks/route.ts`: select package and fingerprints for all three hosts.
- `scripts/generate-icons.py`: generate a distinct admin launcher icon family.
- `public/icons/admin/*`: admin PWA/TWA icons.
- `.env.example`: document three origins and three Digital Asset Links configurations.
- `tests/hosts.test.ts`: pure origin/host classification tests.
- `tests/host-routing.test.ts`: canonical surface routing tests.
- `tests/manifest.test.ts`: audience manifest contract tests.
- `tests/assetlinks.test.ts`: package/fingerprint selection tests.
- `android/customer/twa-manifest.json`: reproducible customer TWA definition.
- `android/business/twa-manifest.json`: reproducible business TWA definition.
- `android/admin/twa-manifest.json`: reproducible admin TWA definition.
- `scripts/android/generate-projects.mjs`: regenerate all three Bubblewrap projects.
- `scripts/android/build-releases.mjs`: validate signing inputs, build all apps, and collect six artifacts.
- `scripts/android/verify-releases.mjs`: inspect artifact existence, signatures, and package identities.
- `android/.gitignore`: exclude SDKs, generated projects, secrets, and build output while retaining TWA definitions.
- `android/signing.properties.example`: document required local signing keys without secrets.
- `docs/android-release.md`: operating guide for building, backing up the upload key, deploying environment values, and completing Play App Signing.
- `package.json`: add test and Android release commands plus the pinned Bubblewrap development dependency.

---

### Task 1: Three-Origin Host Model

**Files:**
- Modify: `lib/hosts.ts`
- Create: `tests/hosts.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `type AppSurface = "customer" | "business" | "admin"`.
- Produces: `classifyHost(host: string | null | undefined): AppSurface`.
- Produces: `originFor(surface: AppSurface): string | null`.
- Preserves: `CUSTOMER_ORIGIN`, `BUSINESS_ORIGIN`, and `isBusinessHost()` for existing callers.
- Adds: `ADMIN_ORIGIN` and `isAdminHost()`.

- [ ] **Step 1: Add the test command and write failing host tests**

Add `"test": "tsx --test tests/**/*.test.ts"` to `package.json`, then create `tests/hosts.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

process.env.NEXT_PUBLIC_BASE_URL = "https://shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_BUSINESS_URL = "https://business.shokherkhabar.arnayem.top";
process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.shokherkhabar.arnayem.top";

const hosts = await import("../lib/hosts");

test("classifies each configured production hostname", () => {
  assert.equal(hosts.classifyHost("shokherkhabar.arnayem.top"), "customer");
  assert.equal(hosts.classifyHost("business.shokherkhabar.arnayem.top"), "business");
  assert.equal(hosts.classifyHost("admin.shokherkhabar.arnayem.top"), "admin");
});

test("normalizes case and preserves explicit ports", () => {
  assert.equal(hosts.classifyHost("ADMIN.SHOKHERKHABAR.ARNAYEM.TOP"), "admin");
  assert.equal(hosts.classifyHost("localhost:4410"), "customer");
});

test("keeps legacy predicates available", () => {
  assert.equal(hosts.isBusinessHost("business.shokherkhabar.arnayem.top"), true);
  assert.equal(hosts.isAdminHost("admin.shokherkhabar.arnayem.top"), true);
});
```

- [ ] **Step 2: Run the tests and confirm the new API is missing**

Run: `npm test -- --test-name-pattern="classifies|normalizes|legacy"`

Expected: FAIL because `classifyHost`, `ADMIN_ORIGIN`, or `isAdminHost` is not exported.

- [ ] **Step 3: Implement the three-origin model**

Refactor `lib/hosts.ts` around this public contract:

```ts
export type AppSurface = "customer" | "business" | "admin";

export const CUSTOMER_ORIGIN = originOf(process.env.NEXT_PUBLIC_BASE_URL);
export const BUSINESS_ORIGIN = originOf(process.env.NEXT_PUBLIC_BUSINESS_URL);
export const ADMIN_ORIGIN = originOf(process.env.NEXT_PUBLIC_ADMIN_URL);

const hostBySurface: Record<AppSurface, string | null> = {
  customer: CUSTOMER_ORIGIN ? new URL(CUSTOMER_ORIGIN).host.toLowerCase() : null,
  business: BUSINESS_ORIGIN ? new URL(BUSINESS_ORIGIN).host.toLowerCase() : null,
  admin: ADMIN_ORIGIN ? new URL(ADMIN_ORIGIN).host.toLowerCase() : null,
};

export function classifyHost(host: string | null | undefined): AppSurface {
  const normalized = host?.toLowerCase() ?? "";
  if (hostBySurface.business && normalized === hostBySurface.business) return "business";
  if (hostBySurface.admin && normalized === hostBySurface.admin) return "admin";
  return "customer";
}

export function originFor(surface: AppSurface): string | null {
  return surface === "customer" ? CUSTOMER_ORIGIN : surface === "business" ? BUSINESS_ORIGIN : ADMIN_ORIGIN;
}

export const isBusinessHost = (host: string | null | undefined) => classifyHost(host) === "business";
export const isAdminHost = (host: string | null | undefined) => classifyHost(host) === "admin";
```

- [ ] **Step 4: Run the focused and full test commands**

Run: `npm test`

Expected: all host tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/hosts.ts tests/hosts.test.ts
git commit -m "feat: model customer business and admin origins"
```

### Task 2: Canonical Three-Surface Routing

**Files:**
- Create: `lib/hostRouting.ts`
- Create: `tests/host-routing.test.ts`
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `AppSurface` and `originFor(surface)` from Task 1.
- Produces: `canonicalSurface(pathname: string): AppSurface | "shared"`.
- Produces: `canonicalLocation(surface: AppSurface, pathname: string, search: string): string | null`.
- Keeps the existing middleware role arrays and JWT validation unchanged.

- [ ] **Step 1: Write routing-policy tests**

Create `tests/host-routing.test.ts` covering these exact expectations:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSurface } from "../lib/hostRouting";

test("assigns protected areas to their applications", () => {
  assert.equal(canonicalSurface("/vendor/orders"), "business");
  assert.equal(canonicalSurface("/q/token"), "business");
  assert.equal(canonicalSurface("/admin/shops"), "admin");
  assert.equal(canonicalSurface("/s/anwars-kitchen"), "customer");
});

test("keeps legal and account-removal pages shared", () => {
  assert.equal(canonicalSurface("/privacy"), "shared");
  assert.equal(canonicalSurface("/terms"), "shared");
  assert.equal(canonicalSurface("/delete-account"), "shared");
});
```

- [ ] **Step 2: Run the routing tests and confirm failure**

Run: `npm test -- --test-name-pattern="protected areas|legal"`

Expected: FAIL because `lib/hostRouting.ts` does not exist.

- [ ] **Step 3: Implement the pure routing policy**

Create `lib/hostRouting.ts` with path-prefix matching and these rules:

```ts
import type { AppSurface } from "./hosts";

const sharedPaths = ["/privacy", "/terms", "/delete-account"];
const under = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

export function canonicalSurface(pathname: string): AppSurface | "shared" {
  if (sharedPaths.some((root) => under(pathname, root))) return "shared";
  if (under(pathname, "/vendor") || under(pathname, "/q")) return "business";
  if (under(pathname, "/admin")) return "admin";
  return "customer";
}
```

- [ ] **Step 4: Apply the routing policy in middleware**

Update `middleware.ts` to classify the request host once, redirect `/` on business to `/vendor` and `/` on admin to `/admin`, preserve vendor `/login` and `/apply` aliases, and send non-shared paths to the `originFor(canonicalSurface(pathname))` origin when it differs from the current surface. Keep the existing vendor and admin JWT role gates after hostname routing.

- [ ] **Step 5: Run web verification**

Run: `npm test && npm run lint && npm run build`

Expected: all tests PASS, lint has no errors, and the production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/hostRouting.ts middleware.ts tests/host-routing.test.ts
git commit -m "feat: route three app surfaces by hostname"
```

### Task 3: Host-Specific Manifests and Admin Branding

**Files:**
- Modify: `lib/brand.ts`
- Modify: `app/manifest.ts`
- Modify: `scripts/generate-icons.py`
- Create: `public/icons/admin/icon-192.png`
- Create: `public/icons/admin/icon-512.png`
- Create: `public/icons/admin/icon-maskable-512.png`
- Create: `public/icons/admin/play-store-512.png`
- Create: `public/icons/admin/apple-touch-icon.png`
- Create: `tests/manifest.test.ts`

**Interfaces:**
- Adds: `adminBrand` with `name`, `appShortName`, `description`, `startUrl`, and `iconBackgroundHex`.
- Adds: `manifestForSurface(surface: AppSurface): MetadataRoute.Manifest`.
- Preserves the default `manifest()` export used by Next.js.

- [ ] **Step 1: Write manifest contract tests**

Create `tests/manifest.test.ts` that imports `manifestForSurface` and asserts:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { manifestForSurface } from "../app/manifest";

test("each surface has a stable start URL and distinct icon directory", () => {
  const customer = manifestForSurface("customer");
  const business = manifestForSurface("business");
  const admin = manifestForSurface("admin");
  assert.equal(customer.start_url, "/");
  assert.equal(business.start_url, "/vendor");
  assert.equal(admin.start_url, "/admin");
  assert.match(String(business.icons?.[0]?.src), /^\/icons\/business\//);
  assert.match(String(admin.icons?.[0]?.src), /^\/icons\/admin\//);
  assert.notEqual(admin.name, business.name);
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- --test-name-pattern="stable start URL"`

Expected: FAIL because `manifestForSurface` and `adminBrand` do not exist.

- [ ] **Step 3: Add admin branding and pure manifest generation**

Add to `lib/brand.ts`:

```ts
export const adminBrand = {
  name: `${brand.name} Admin`,
  appShortName: "শখের Admin",
  description: `Manage ${brand.name} shops, locations, customers, finance and platform operations.`,
  startUrl: "/admin",
  iconBackgroundHex: "#102A1D",
};
```

Refactor `app/manifest.ts` so the default export reads `classifyHost(headers().get("host"))` and delegates to the pure exported `manifestForSurface`. Preserve existing customer/business shortcuts and add admin shortcuts for `/admin/shops`, `/admin/locations`, and `/admin/analytics`.

- [ ] **Step 4: Extend and run icon generation**

Update `scripts/generate-icons.py` with an admin treatment that remains recognizably শখের খাবার but cannot be confused with the customer or business icon. Generate all five admin files listed above and verify their sizes using `sips -g pixelWidth -g pixelHeight public/icons/admin/*.png`.

- [ ] **Step 5: Run manifest and production checks**

Run: `npm test && npm run lint && npm run build`

Expected: tests PASS and Next.js builds all routes successfully.

- [ ] **Step 6: Commit**

```bash
git add lib/brand.ts app/manifest.ts scripts/generate-icons.py public/icons/admin tests/manifest.test.ts
git commit -m "feat: add admin app manifest and branding"
```

### Task 4: Digital Asset Links for Three Packages

**Files:**
- Modify: `app/api/well-known/assetlinks/route.ts`
- Create: `lib/android/assetlinks.ts`
- Create: `tests/assetlinks.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `assetLinkForSurface(surface: AppSurface, env: NodeJS.ProcessEnv): AssetLink[] | null`.
- `AssetLink` contains relation `delegate_permission/common.handle_all_urls`, namespace `android_app`, one package name, and validated SHA-256 fingerprints.

- [ ] **Step 1: Write Digital Asset Links tests**

Create `tests/assetlinks.test.ts` with a valid 32-byte colon-delimited fingerprint and assert that customer, business, and admin select `ANDROID_PACKAGE_NAME`, `ANDROID_BUSINESS_PACKAGE_NAME`, and `ANDROID_ADMIN_PACKAGE_NAME` respectively. Add a test that malformed fingerprints are removed and an empty valid list returns `null`.

- [ ] **Step 2: Run the tests and confirm failure**

Run: `npm test -- --test-name-pattern="Digital Asset|malformed"`

Expected: FAIL because `lib/android/assetlinks.ts` does not exist.

- [ ] **Step 3: Extract and implement the pure selector**

Create `lib/android/assetlinks.ts` with this mapping:

```ts
const keys = {
  customer: ["ANDROID_PACKAGE_NAME", "ANDROID_SHA256_CERT_FINGERPRINTS"],
  business: ["ANDROID_BUSINESS_PACKAGE_NAME", "ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS"],
  admin: ["ANDROID_ADMIN_PACKAGE_NAME", "ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS"],
} as const;
```

Validate package names as Java-style reverse-domain identifiers and fingerprints with `/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/`. Return `null` when either the package or valid fingerprint list is absent.

- [ ] **Step 4: Make the route host-aware and document environment values**

Update the route to call `assetLinkForSurface(classifyHost(headers().get("host")), process.env)`, returning the current no-store 404 on `null`. Add these exact defaults to `.env.example`:

```dotenv
NEXT_PUBLIC_BASE_URL="https://shokherkhabar.arnayem.top"
NEXT_PUBLIC_BUSINESS_URL="https://business.shokherkhabar.arnayem.top"
NEXT_PUBLIC_ADMIN_URL="https://admin.shokherkhabar.arnayem.top"
ANDROID_PACKAGE_NAME="top.arnayem.shokherkhabar"
ANDROID_SHA256_CERT_FINGERPRINTS=""
ANDROID_BUSINESS_PACKAGE_NAME="top.arnayem.shokherkhabar.business"
ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS=""
ANDROID_ADMIN_PACKAGE_NAME="top.arnayem.shokherkhabar.admin"
ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS=""
```

- [ ] **Step 5: Run all web checks**

Run: `npm test && npm run lint && npm run build`

Expected: all commands succeed.

- [ ] **Step 6: Commit**

```bash
git add app/api/well-known/assetlinks/route.ts lib/android/assetlinks.ts tests/assetlinks.test.ts .env.example
git commit -m "feat: serve asset links for three Android apps"
```

### Task 5: Reproducible Trusted Web Activity Projects

**Files:**
- Create: `android/customer/twa-manifest.json`
- Create: `android/business/twa-manifest.json`
- Create: `android/admin/twa-manifest.json`
- Create: `android/.gitignore`
- Create: `scripts/android/apps.mjs`
- Create: `scripts/android/generate-projects.mjs`
- Create: `tests/android-config.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ANDROID_APPS`, an immutable array of `{ key, name, packageId, host, startUrl, manifestPath, projectDir }`.
- Produces npm command: `npm run android:generate`.
- Uses `@bubblewrap/cli@1.25.0` from development dependencies.

- [ ] **Step 1: Write Android identity tests**

Create `tests/android-config.test.ts` to assert that `ANDROID_APPS` contains exactly three distinct package IDs and hosts, that each start URL begins with `/`, and that each `twa-manifest.json` matches its `packageId`, `host`, `name`, and `startUrl`.

- [ ] **Step 2: Run the identity test and confirm failure**

Run: `npm test -- --test-name-pattern="Android app identities"`

Expected: FAIL because the app registry and manifests do not exist.

- [ ] **Step 3: Add the registry and three Bubblewrap manifests**

Create `scripts/android/apps.mjs` with the three Global Constraint identities. Create each `twa-manifest.json` using Bubblewrap's schema, HTTPS launch URLs, version name `1.0.0`, version code `1`, portrait orientation for customer, and any orientation for business/admin. Reference the corresponding 512px icon in `public/icons`, using an absolute local file URI resolved by the generation script.

- [ ] **Step 4: Add deterministic generation**

Add `@bubblewrap/cli` version `1.25.0` to dev dependencies. Create `scripts/android/generate-projects.mjs` to iterate `ANDROID_APPS`, remove only each app's ignored `generated/` directory, validate its manifest, then invoke the local Bubblewrap binary with arguments rather than shell-interpolated strings. Exit nonzero on the first failure and print the app key and command output.

Add to `package.json`:

```json
"android:generate": "node scripts/android/generate-projects.mjs"
```

- [ ] **Step 5: Ignore generated and secret material**

Create `android/.gitignore` containing:

```gitignore
*/generated/
release-output/
signing.properties
*.jks
*.keystore
.bubblewrap/
```

- [ ] **Step 6: Generate all three projects and run tests**

Run: `npm install && npm test && npm run android:generate`

Expected: tests PASS and each of `android/customer/generated`, `android/business/generated`, and `android/admin/generated` contains a Gradle Android project with the correct application ID.

- [ ] **Step 7: Commit reproducible sources only**

```bash
git add package.json package-lock.json android scripts/android tests/android-config.test.ts
git commit -m "build: define three trusted web activity apps"
```

### Task 6: Signing, Release Builds, and Artifact Verification

**Files:**
- Create: `android/signing.properties.example`
- Create: `scripts/android/create-upload-key.mjs`
- Create: `scripts/android/build-releases.mjs`
- Create: `scripts/android/verify-releases.mjs`
- Create: `tests/android-release-scripts.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces npm commands: `android:key`, `android:build`, and `android:verify`.
- Reads ignored `android/signing.properties` with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`.
- Writes exactly six artifacts beneath ignored `android/release-output/` using the filenames in the spec.

- [ ] **Step 1: Write release-script contract tests**

Create tests that import parsing helpers from the scripts and verify: missing signing fields fail with a field-specific message; duplicate package IDs fail before building; artifact names are exactly the six spec filenames; and subprocess arguments are arrays with no shell execution.

- [ ] **Step 2: Run the contract tests and confirm failure**

Run: `npm test -- --test-name-pattern="signing fields|artifact names"`

Expected: FAIL because the release scripts do not exist.

- [ ] **Step 3: Implement safe upload-key creation**

Create `android/signing.properties.example` with empty values and comments. Implement `create-upload-key.mjs` to generate a cryptographically random password, call `keytool -genkeypair` with alias `shokherkhabar-upload`, RSA 4096, SHA256withRSA, and a 10,000-day validity, and write the ignored properties file with mode `0600`. Refuse to overwrite an existing keystore or properties file. Print the backup locations, never the password.

- [ ] **Step 4: Implement builds and collection**

Implement `build-releases.mjs` to parse and validate the signing properties, ensure the generated projects exist, configure Bubblewrap/Gradle release signing for each project, run the APK and bundle release tasks, and copy outputs to:

```text
android/release-output/shokher-khabar-customer.apk
android/release-output/shokher-khabar-customer.aab
android/release-output/shokher-khabar-business.apk
android/release-output/shokher-khabar-business.aab
android/release-output/shokher-khabar-admin.apk
android/release-output/shokher-khabar-admin.aab
```

Never invoke subprocesses with `shell: true`, and redact signing paths and secrets from thrown errors.

- [ ] **Step 5: Implement artifact verification**

Implement `verify-releases.mjs` to verify all six files are nonempty; verify APK signatures with `apksigner verify --verbose --print-certs`; verify AAB signatures with `jarsigner -verify`; inspect the three APK package IDs with `apkanalyzer manifest application-id`; and compare the SHA-256 signer fingerprint with the generated upload certificate.

- [ ] **Step 6: Register npm commands and run unit tests**

Add:

```json
"android:key": "node scripts/android/create-upload-key.mjs",
"android:build": "node scripts/android/build-releases.mjs",
"android:verify": "node scripts/android/verify-releases.mjs"
```

Run: `npm test`

Expected: all script contract tests PASS.

- [ ] **Step 7: Generate the local key and build all artifacts**

Run: `npm run android:key && npm run android:build && npm run android:verify`

Expected: six release files exist, all signatures verify, and package IDs match the Global Constraints.

- [ ] **Step 8: Commit scripts, not secrets or binaries**

Run `git status --short --ignored android` and confirm the keystore, `signing.properties`, generated projects, and release output are ignored.

```bash
git add package.json package-lock.json android/signing.properties.example scripts/android tests/android-release-scripts.test.ts
git commit -m "build: automate signed Android releases"
```

### Task 7: Deployment and Play Store Handoff

**Files:**
- Create: `docs/android-release.md`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Documents the local artifact paths, upload-key backup, three-host DNS/TLS requirements, production environment values, Digital Asset Links verification, Play App Signing fingerprint update, and Play Console upload order.

- [ ] **Step 1: Write the release runbook**

Create `docs/android-release.md` with exact commands:

```bash
npm install
npm test
npm run lint
npm run build
npm run android:generate
npm run android:key
npm run android:build
npm run android:verify
```

Document the six artifact paths and the ignored upload-key backup files. State that the `.aab` files go to Play Console and the `.apk` files are for direct testing.

- [ ] **Step 2: Document production deployment values**

Include the three exact origins/package IDs, require valid HTTPS on every origin, and show how to place the upload certificate fingerprint into each matching `ANDROID_*_SHA256_CERT_FINGERPRINTS` variable. Explain that after the first Play upload, the Play App Signing SHA-256 fingerprint must be appended to that same comma-separated variable and the deployment restarted.

- [ ] **Step 3: Add endpoint verification commands**

Document these checks for every domain:

```bash
curl -fsS https://shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://shokherkhabar.arnayem.top/.well-known/assetlinks.json
curl -fsS https://business.shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://business.shokherkhabar.arnayem.top/.well-known/assetlinks.json
curl -fsS https://admin.shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://admin.shokherkhabar.arnayem.top/.well-known/assetlinks.json
```

Also document installing all APKs with `adb install` and confirming that the three application IDs coexist.

- [ ] **Step 4: Update the project overview**

Change README's “Two apps, one server” section to “Three apps, one server,” add the admin domain and role, and link to `docs/android-release.md`.

- [ ] **Step 5: Run the complete release gate**

Run:

```bash
npm test
npm run lint
npm run build
npm run android:generate
npm run android:build
npm run android:verify
git diff --check
```

Expected: every command succeeds, six signed artifacts are present, and Git reports no whitespace errors.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md docs/android-release.md .env.example
git commit -m "docs: add Android release and Play Store runbook"
```

### Task 8: Final Device and Release Audit

**Files:**
- Modify only if a verification failure requires a scoped correction.

**Interfaces:**
- Consumes the six artifacts and three deployed origins.
- Produces a final handoff report with checks passed, artifact paths, SHA-256 checksums, certificate fingerprint, and any external Play Console action still required.

- [ ] **Step 1: Record artifact hashes**

Run: `shasum -a 256 android/release-output/*.{apk,aab}`

Expected: six unique checksum lines.

- [ ] **Step 2: Install and smoke-test all APKs**

With one Android device or emulator connected, install all three APKs. Confirm distinct launcher entries, correct launch origin, full-screen verified TWA behavior, back navigation, sign-in redirection, and that customer/vendor/admin routes cannot be opened from the wrong host without canonical redirection.

- [ ] **Step 3: Validate live association files**

Run the six `curl` commands from Task 7 against the deployed origins. Confirm every manifest has its correct name/start URL/icons and every asset-link response has exactly the matching package ID plus the upload fingerprint.

- [ ] **Step 4: Run the final repository gate**

Run: `npm test && npm run lint && npm run build && npm run android:verify && git status --short`

Expected: all checks pass; only intentionally ignored release artifacts and secrets are outside Git; tracked files are clean.

- [ ] **Step 5: Write the handoff summary**

Report all six absolute artifact paths, their SHA-256 hashes, the upload certificate fingerprint, where the ignored key backup lives, and the exact Play Console follow-up: create three listings, enroll each in Play App Signing, upload its matching AAB, add each Play signing fingerprint to the corresponding production environment variable, redeploy, and re-run Digital Asset Links verification.

