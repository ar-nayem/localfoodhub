import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { classifyHost } from "@/lib/hosts";
import { assetLinkForSurface } from "@/lib/android/assetlinks";

// Served at /.well-known/assetlinks.json via the rewrite in next.config.js.
//
// This file is how Android verifies that the Play Store app and this website belong to
// the same owner. When it's valid, the app opens full-screen with no browser address bar;
// when it's missing or wrong, the app still installs but shows a URL bar across the top,
// which looks broken and fails Google's quality bar for web-wrapped apps.
//
// Both values come from env rather than a static file because the fingerprint doesn't
// exist until the signing key is generated — and Play App Signing then re-signs the app
// with a *second* key whose fingerprint must be listed too. Adding one is an .env edit
// plus a restart, not a code change.
//
// There are three Android apps, one per hostname, and Android fetches this file from the
// hostname the app is bound to — so each host answers with only its own app's package:
//
//   Customer hostname:
//     ANDROID_PACKAGE_NAME=top.arnayem.shokherkhabar
//     ANDROID_SHA256_CERT_FINGERPRINTS=AB:CD:...,12:34:...
//   Business hostname:
//     ANDROID_BUSINESS_PACKAGE_NAME=top.arnayem.shokherkhabar.business
//     ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS=AB:CD:...,12:34:...
//   Admin hostname:
//     ANDROID_ADMIN_PACKAGE_NAME=top.arnayem.shokherkhabar.admin
//     ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS=AB:CD:...,12:34:...

export const dynamic = "force-dynamic";

export function GET() {
  const assetLinks = assetLinkForSurface(classifyHost(headers().get("host")), process.env);

  if (!assetLinks) {
    return NextResponse.json(
      { error: "Android app link not configured yet" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    assetLinks,
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
