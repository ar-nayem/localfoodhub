# Three Android Apps Design

## Objective

Ship three separately installable Android applications for the existing শখের খাবার platform. Each application targets one audience and has its own Play Store identity while continuing to use the existing Next.js application, authentication system, and shared database.

The release will include a signed APK for direct installation and testing and a signed Android App Bundle (AAB) for Play Store submission for each audience.

## Applications

| Audience | Play Store name | Production origin | Start route | Android package ID |
|---|---|---|---|---|
| Customers | শখের খাবার | `https://shokherkhabar.arnayem.top` | `/` | `top.arnayem.shokherkhabar` |
| Vendors and shop staff | শখের খাবার Business | `https://business.shokherkhabar.arnayem.top` | `/vendor` | `top.arnayem.shokherkhabar.business` |
| Company administrators | শখের খাবার Admin | `https://admin.shokherkhabar.arnayem.top` | `/admin` | `top.arnayem.shokherkhabar.admin` |

Android package IDs are permanent release identities and must not change after the Play Store listings are created.

## Architecture

The apps will be Trusted Web Activities (TWAs), not independent native rewrites or generic WebViews. Each Android package opens its assigned HTTPS origin full-screen and delegates application behavior to the existing responsive web application.

All three origins resolve to the same deployed Next.js application and use the same database. Host-aware routing determines which surface a request may display:

- The customer origin serves customer pages and redirects vendor and admin entry points to their assigned origins.
- The business origin serves vendor, order-verification, and shared legal/account-removal pages. Other product surfaces redirect to their canonical origin.
- The admin origin serves admin and shared legal/account-removal pages. Other product surfaces redirect to their canonical origin.

Hostname routing is a presentation boundary, not the security boundary. Existing server-side session and role authorization remains authoritative. Vendor pages accept shop staff roles, and admin pages accept only `ADMIN` and `SUPER_ADMIN` roles. API handlers continue to authorize every protected operation independently.

## Web Application Changes

The existing two-origin configuration will become a three-origin configuration.

- Add an admin origin environment variable and host detector alongside the current customer and business values.
- Update middleware to route customer, business, and admin traffic to their canonical origins without redirect loops behind a reverse proxy.
- Extend the dynamic manifest endpoint to return audience-specific metadata based on the request hostname.
- Add an admin brand configuration and a distinct admin icon set.
- Extend the Digital Asset Links endpoint so each hostname publishes only the package name and signing certificate fingerprints belonging to its Android application.
- Update `.env.example` and deployment documentation with the admin origin, admin package name, and admin certificate fingerprint variables.

The customer and business experiences retain their current features. This project adds packaging and separation; it does not duplicate the database or rebuild the three product surfaces as native screens.

## Android Projects and Release Artifacts

Three reproducible Android wrapper projects will live under a dedicated Android release directory in the repository. Each project will contain its own application ID, launcher name, icons, launch URL, verified origin, and TWA configuration.

Release builds will produce:

- `shokher-khabar-customer.apk`
- `shokher-khabar-customer.aab`
- `shokher-khabar-business.apk`
- `shokher-khabar-business.aab`
- `shokher-khabar-admin.apk`
- `shokher-khabar-admin.aab`

Generated binaries will be collected in one documented release-output directory. Build intermediates remain ignored.

## Signing and Domain Verification

The release artifacts require an upload-signing key. The keystore and its credentials must never be committed to Git. The build will load signing values from a local ignored properties file or environment variables, and the handoff documentation will identify the local files that must be backed up securely.

Each live origin must serve `/.well-known/assetlinks.json` with its corresponding package ID and SHA-256 certificate fingerprints. During direct APK testing, this includes the local upload certificate fingerprint. After each AAB is registered with Play App Signing, the Play Console app-signing certificate fingerprint must also be added to the relevant production environment variable. Both fingerprints may coexist.

If Digital Asset Links verification is incomplete, Android may display the site as a browser Custom Tab rather than a full-screen trusted application. This is a deployment/configuration failure, not a reason to weaken the TWA security model.

## Data and Authentication Flow

1. Android launches the assigned verified HTTPS origin.
2. Next.js selects the audience manifest and applies host routing.
3. The existing session cookie and server authorization determine the signed-in user and permitted role.
4. Pages and API routes operate against the shared Prisma database exactly as the website does today.
5. Cross-audience links move to the canonical origin and require the correct session and role there.

No customer, vendor, or admin data is stored in a separate Android database. Existing browser-managed storage and session behavior remains scoped by hostname.

## Offline and Failure Behavior

The wrappers depend on the deployed web application and network connectivity for transactional features. The existing service worker/offline page remains the fallback when navigation cannot reach the server. Authentication, ordering, payment, vendor operations, and admin mutations must fail closed when the backend is unavailable.

An invalid role or expired session redirects to the appropriate sign-in page. An incorrect hostname redirects to the canonical app origin. Missing Digital Asset Links configuration returns an explicit configuration error from the association endpoint rather than publishing an invalid association.

## Verification

The implementation will be verified at four layers:

1. **Web checks:** lint/type/build checks and focused tests for host classification, redirects, manifests, and asset-link selection.
2. **Origin checks:** request each manifest and Digital Asset Links response using all three hostnames and confirm the audience-specific values.
3. **Android checks:** build release APK and AAB variants for all three package IDs and inspect their application IDs, labels, versions, launch origins, and signatures.
4. **Device checks:** install the APKs on an Android device or emulator, confirm that all three can coexist, verify their launch routes and back navigation, and confirm authentication/access isolation.

A release is complete only when all six artifacts build successfully and the deployment checklist identifies every remaining Play Console action that cannot be performed from the repository.

## Out of Scope

- Rewriting the existing web experiences as native Android screens.
- Creating separate databases or duplicating backend services.
- Publishing the apps to the user's Play Console without explicit account access and authorization.
- Inventing new customer, vendor, or admin product features unrelated to producing the three Android releases.

