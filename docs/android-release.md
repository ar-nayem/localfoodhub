# Android release and Play Store handoff

One Next.js deployment serves three HTTPS origins. Each origin has a distinct Trusted Web Activity and Android package:

| App | HTTPS origin | Start route | Android package |
| --- | --- | --- | --- |
| শখের খাবার | `https://shokherkhabar.arnayem.top` | `/` | `top.arnayem.shokherkhabar` |
| শখের খাবার Business | `https://business.shokherkhabar.arnayem.top` | `/vendor` | `top.arnayem.shokherkhabar.business` |
| শখের খাবার Admin | `https://admin.shokherkhabar.arnayem.top` | `/admin` | `top.arnayem.shokherkhabar.admin` |

## Local release build

Run from the repository root with Node 24, JDK 17, and the Android SDK installed. The verified local toolchain used OpenJDK 17.0.20, Android platform 36, build-tools 36.1.0, command-line tools 19.0, and the pinned Bubblewrap 1.25.0. The release scripts locate the real JDK/SDK configuration; the ignored `android/.bubblewrap/generation-config.json` is only a generation aid.

For the reproducible build gate, provide the three exact public origins at build time (`NEXT_PUBLIC_*` values are baked into the Next.js build). The SQLite path below is the local verification database, not a production database:

```bash
export DATABASE_URL=file:/private/tmp/localfoodhub-three-play-apps.db
export NEXT_PUBLIC_BASE_URL=https://shokherkhabar.arnayem.top
export NEXT_PUBLIC_BUSINESS_URL=https://business.shokherkhabar.arnayem.top
export NEXT_PUBLIC_ADMIN_URL=https://admin.shokherkhabar.arnayem.top
npm install
npm test
npm run lint
npm run build
npm run android:generate
npm run android:key
npm run android:build
npm run android:verify
git diff --check
```

Run `npm run android:key` **once**, only when neither signing file exists. It refuses to overwrite either file. On later builds, keep the same two ignored files and skip that command; never regenerate the upload key for an existing Play identity. The key has alias `shokherkhabar-upload`. The verified upload certificate SHA-256 is public information:

```text
14:05:F2:E4:CC:D9:37:86:9E:F6:E0:88:9B:5D:81:D4:B7:1D:1E:32:5A:EA:CA:BA:4D:09:A8:66:C2:2F:40:79
```

Back up these two files **together** in secure, access-controlled storage before releasing. Both are ignored by Git and contain private signing material; never put either in source control, a store listing, or a support ticket:

- `android/upload.jks` — upload keystore
- `android/signing.properties` — alias, keystore path, and passwords

The six signed files are generated in ignored `android/release-output/`:

| Play Console upload (AAB) | Direct device test (APK) |
| --- | --- |
| `android/release-output/shokher-khabar-customer.aab` | `android/release-output/shokher-khabar-customer.apk` |
| `android/release-output/shokher-khabar-business.aab` | `android/release-output/shokher-khabar-business.apk` |
| `android/release-output/shokher-khabar-admin.aab` | `android/release-output/shokher-khabar-admin.apk` |

Upload the **AAB** for each app to its matching Play Console package. The **APK** is for direct local device testing; it is not the Play upload. `npm run android:verify` checks all six signatures, their upload certificate, the three APK package IDs, and the exact file set.

## Production deployment and Digital Asset Links

Point DNS for all three hostnames at the same application deployment. Provide a valid publicly trusted HTTPS certificate for **each** hostname, keep HTTPS and its certificate chain valid, and preserve the incoming `Host` header through the reverse proxy: host routing and `assetlinks.json` select the app by that header. Deploy the Next.js build with the exact three `NEXT_PUBLIC_*_URL` values shown above; changing those requires a rebuild. Set a production `DATABASE_URL` to persistent storage, a strong private `JWT_SECRET`, and any SMTP/Google credentials used by the site. Do not use the local verification SQLite path or the example JWT secret for production. Make uploaded media persistent as well.

Set the package variables and the **same upload certificate** on all three matching fingerprint variables before checking Digital Asset Links. These are public certificate fingerprints, not signing passwords:

```dotenv
ANDROID_PACKAGE_NAME="top.arnayem.shokherkhabar"
ANDROID_SHA256_CERT_FINGERPRINTS="14:05:F2:E4:CC:D9:37:86:9E:F6:E0:88:9B:5D:81:D4:B7:1D:1E:32:5A:EA:CA:BA:4D:09:A8:66:C2:2F:40:79"
ANDROID_BUSINESS_PACKAGE_NAME="top.arnayem.shokherkhabar.business"
ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS="14:05:F2:E4:CC:D9:37:86:9E:F6:E0:88:9B:5D:81:D4:B7:1D:1E:32:5A:EA:CA:BA:4D:09:A8:66:C2:2F:40:79"
ANDROID_ADMIN_PACKAGE_NAME="top.arnayem.shokherkhabar.admin"
ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS="14:05:F2:E4:CC:D9:37:86:9E:F6:E0:88:9B:5D:81:D4:B7:1D:1E:32:5A:EA:CA:BA:4D:09:A8:66:C2:2F:40:79"
```

After the first AAB upload and Play App Signing enrollment, retrieve the **Play App Signing certificate SHA-256** for each app from Play Console's App integrity page. Append that app's Play fingerprint to its corresponding `ANDROID_*_SHA256_CERT_FINGERPRINTS` value, separated by a comma, while retaining the upload fingerprint. The Play fingerprints may differ across the three apps. Restart the deployment after changing those server environment variables, then check the live JSON again. This step is required for Play-installed builds because Play signs delivered APKs with its app signing key. An empty fingerprint value makes that host return HTTP 404.

Check the endpoints on every deployed hostname:

```bash
curl -fsS https://shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://shokherkhabar.arnayem.top/.well-known/assetlinks.json
curl -fsS https://business.shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://business.shokherkhabar.arnayem.top/.well-known/assetlinks.json
curl -fsS https://admin.shokherkhabar.arnayem.top/manifest.webmanifest
curl -fsS https://admin.shokherkhabar.arnayem.top/.well-known/assetlinks.json
```

Each manifest must describe its own start URL and each `assetlinks.json` must contain only its matching package and the expected SHA-256 fingerprints. A successful HTTP response alone does not establish that Android trusts the link; confirm full-screen opening on a device for both direct and Play-installed builds.

## Device test and Play Console order

With an Android device connected and USB debugging enabled, install all three local test APKs and confirm all three application IDs coexist:

```bash
adb install -r android/release-output/shokher-khabar-customer.apk
adb install -r android/release-output/shokher-khabar-business.apk
adb install -r android/release-output/shokher-khabar-admin.apk
adb shell pm path top.arnayem.shokherkhabar
adb shell pm path top.arnayem.shokherkhabar.business
adb shell pm path top.arnayem.shokherkhabar.admin
```

Each `pm path` must print an installed APK path. Launch each icon and check that it opens its own HTTPS origin and correct role route. For Play distribution, create three distinct Play Console app records, associate each with its package ID in the table, enroll each in Play App Signing, then upload the matching **AAB** to an internal test track. Retrieve and deploy each Play signing fingerprint as described above, verify all six live endpoints, and test all three Play-installed apps before promoting a release. Store listings, policy forms, screenshots, and publication remain Play Console operator work.

## Dependency audit before public deployment

The September 30, 2026 `npm audit --omit=dev` reports four production dependency findings: Next.js (critical aggregate), Nodemailer (high), PostCSS through Next.js (high), and `uuid` (moderate). Next.js 14.2.35 is the deployed server and has relevant request/Server Component denial-of-service advisories; its image optimizer is also configured here. Nodemailer is used when SMTP OTP delivery is enabled. Plan and test a framework/mail dependency update before exposing the production service; until then, restrict deployment to controlled testing and keep public image inputs and SMTP recipient handling tightly controlled. PostCSS findings depend on processing attacker-controlled CSS/source maps, which this app does not expose as a public input. The app has no direct `uuid` import, and the reported `uuid` issue concerns v3/v5/v6 with a supplied buffer. The full audit has 17 findings; Bubblewrap 1.25.0 and ESLint-related findings are in local build/lint tooling. Run generation only from trusted repository assets and tool downloads. The release commands above do not update dependencies automatically.
