import { X509Certificate } from "node:crypto";
import { readdir, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { outputRoot, releaseArtifacts, loadSigning, loadToolchain, runCommand, findSdkTool, signingSecrets, signingEnvironment } from "./build-releases.mjs";

export async function checkArtifactFiles(directory = outputRoot) {
  const expected = releaseArtifacts().map((artifact) => artifact.name).sort();
  const actual = (await readdir(directory)).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("Expected exactly six release files; Missing or Unexpected artifact");
  for (const name of expected) {
    const info = await lstat(join(directory, name));
    if (!info.isFile() || !info.size) throw new Error(`Artifact is empty or not a regular file: ${name}`);
  }
}

export function assertFingerprint(actual, expected) {
  const normalize = (value) => value.replaceAll(":", "").toLowerCase();
  const a = normalize(actual);
  const b = normalize(expected);
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b) || a !== b) throw new Error("Signer SHA-256 fingerprint mismatch");
}

export async function verifyReleases() {
  await checkArtifactFiles();
  const signing = await loadSigning();
  const toolchain = await loadToolchain();
  const options = { env: signingEnvironment(toolchain, signing), sensitive: signingSecrets(signing) };
  const apksigner = await findSdkTool(toolchain.sdk, "apksigner");
  const apkanalyzer = await findSdkTool(toolchain.sdk, "apkanalyzer");
  const keytool = join(toolchain.javaHome, "bin/keytool");
  const certificate = await runCommand(keytool, ["-exportcert", "-rfc", "-keystore", signing.storeFile,
    "-alias", signing.keyAlias, "-storepass:env", "RELEASE_STORE_PASSWORD"], options);
  const fingerprint = new X509Certificate(certificate).fingerprint256;
  console.log(`Upload certificate SHA-256: ${fingerprint}`);
  for (const artifact of releaseArtifacts()) {
    const path = join(outputRoot, artifact.name);
    if (artifact.extension === "apk") {
      const result = await runCommand(apksigner, ["verify", "--verbose", "--print-certs", path], options);
      const signers = [...result.matchAll(/Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9]+)/g)];
      if (signers.length !== 1) throw new Error(`${artifact.name}: expected exactly one APK signer`);
      assertFingerprint(signers[0][1], fingerprint);
      const packageId = (await runCommand(apkanalyzer, ["manifest", "application-id", path], options)).trim();
      if (packageId !== artifact.app.packageId) throw new Error(`${artifact.name}: wrong application ID (${packageId})`);
      console.log(`${artifact.name}: signature OK; ${packageId}; SHA-256 signer matches`);
    } else {
      const result = await runCommand(join(toolchain.javaHome, "bin/jarsigner"), ["-J-Duser.language=en", "-verify", "-verbose", "-certs", path], options);
      if (!result.includes("jar verified.") || /unsigned entries|jar is unsigned|treated as unsigned/i.test(result)) {
        throw new Error(`${artifact.name}: AAB signature verification failed`);
      }
      const certs = await runCommand(keytool, ["-printcert", "-rfc", "-jarfile", path], options);
      const certificates = certs.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
      if (certificates.length !== 1) throw new Error(`${artifact.name}: expected exactly one AAB signer certificate`);
      assertFingerprint(new X509Certificate(certificates[0]).fingerprint256, fingerprint);
      console.log(`${artifact.name}: signature OK; SHA-256 signer matches`);
    }
  }
  console.log("Verified exactly six release artifacts.");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  verifyReleases().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
