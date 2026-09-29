import type { AppSurface } from "../hosts";

export interface AssetLink {
  relation: ["delegate_permission/common.handle_all_urls"];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}

const keys = {
  customer: ["ANDROID_PACKAGE_NAME", "ANDROID_SHA256_CERT_FINGERPRINTS"],
  business: ["ANDROID_BUSINESS_PACKAGE_NAME", "ANDROID_BUSINESS_SHA256_CERT_FINGERPRINTS"],
  admin: ["ANDROID_ADMIN_PACKAGE_NAME", "ANDROID_ADMIN_SHA256_CERT_FINGERPRINTS"],
} as const;

const PACKAGE_NAME = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function assetLinkForSurface(surface: AppSurface, env: NodeJS.ProcessEnv): AssetLink[] | null {
  const [packageKey, fingerprintKey] = keys[surface];
  const packageName = env[packageKey]?.trim();
  const fingerprints = (env[fingerprintKey] ?? "")
    .split(",")
    .map((fingerprint) => fingerprint.trim())
    .filter((fingerprint) => FINGERPRINT.test(fingerprint));

  if (!packageName || !PACKAGE_NAME.test(packageName) || fingerprints.length === 0) return null;

  return [{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints,
    },
  }];
}
