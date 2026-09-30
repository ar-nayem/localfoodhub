import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("signing fields reject missing, duplicate, and malformed values without revealing secrets", async () => {
  const { parseSigningProperties } = await import("../scripts/android/build-releases.mjs");
  const values = { storeFile: "upload key.jks", storePassword: "secret=with=equals", keyAlias: "upload", keyPassword: "secret2" };
  for (const field of Object.keys(values)) {
    const text = Object.entries(values).filter(([key]) => key !== field).map(([key, value]) => `${key}=${value}`).join("\n");
    assert.throws(() => parseSigningProperties(text), new RegExp(field));
  }
  const text = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n");
  assert.deepEqual(parseSigningProperties(`# comment\n${text}\n`), values);
  assert.throws(() => parseSigningProperties(`${text}\nstorePassword=other`), /Duplicate.*storePassword/);
  assert.throws(() => parseSigningProperties("SECRET_BAD_LINE"), (error: Error) => !error.message.includes("SECRET_BAD_LINE"));
});

test("artifact names are exactly the six release filenames and duplicate identities fail before building", async () => {
  const { releaseArtifacts, validateApps, buildReleases } = await import("../scripts/android/build-releases.mjs");
  const { ANDROID_APPS } = await import("../scripts/android/apps.mjs");
  assert.deepEqual(releaseArtifacts().map((artifact) => artifact.name), [
    "shokher-khabar-customer.apk", "shokher-khabar-customer.aab",
    "shokher-khabar-business.apk", "shokher-khabar-business.aab",
    "shokher-khabar-admin.apk", "shokher-khabar-admin.aab",
  ]);
  const duplicate = [ANDROID_APPS[0], { ...ANDROID_APPS[1], packageId: ANDROID_APPS[0].packageId }, ANDROID_APPS[2]];
  assert.throws(() => validateApps(duplicate), /Duplicate package/);
  await assert.rejects(buildReleases({ apps: duplicate }), /Duplicate package/);
  assert.throws(() => validateApps([{ ...ANDROID_APPS[0], packageId: "wrong.package" }, ...ANDROID_APPS.slice(1)]), /identity/);
});

test("release subprocesses preserve array arguments without a shell and redact failures", async () => {
  const { runCommand, commandOptions } = await import("../scripts/android/build-releases.mjs");
  assert.equal(commandOptions().shell, false);
  const literal = '$(echo injected); "space value"';
  assert.equal((await runCommand(process.execPath, ["-e", "process.stdout.write(process.argv[1])", literal])).trim(), literal);
  await assert.rejects(runCommand(process.execPath, "not-an-array" as unknown as string[]), /array/);
  await assert.rejects(runCommand(process.execPath, ["-e", "process.stderr.write('password /private/key.jks'); process.exit(2)"], {
    sensitive: ["password", "/private/key.jks"],
  }), (error: Error) => error.message.includes("[REDACTED]") && !error.message.includes("password") && !error.message.includes("/private/key.jks"));
});

test("upload key creation refuses either existing signing file without invoking keytool", async (t) => {
  const { createUploadKey } = await import("../scripts/android/create-upload-key.mjs");
  const directory = await mkdtemp(join(tmpdir(), "release-key-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const propertiesPath = join(directory, "signing.properties");
  const storePath = join(directory, "upload.jks");
  await writeFile(propertiesPath, "preserve");
  await assert.rejects(createUploadKey({ propertiesPath, storePath }), /overwrite/);
  assert.equal(await readFile(propertiesPath, "utf8"), "preserve");
  await rm(propertiesPath);
  await writeFile(storePath, "preserve-key");
  await assert.rejects(createUploadKey({ propertiesPath, storePath }), /overwrite/);
  assert.equal(await readFile(storePath, "utf8"), "preserve-key");
});

test("artifact verification rejects missing, empty, extra files and mismatched signers", async (t) => {
  const { checkArtifactFiles, assertFingerprint } = await import("../scripts/android/verify-releases.mjs");
  const { releaseArtifacts } = await import("../scripts/android/build-releases.mjs");
  const directory = await mkdtemp(join(tmpdir(), "release-output-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(checkArtifactFiles(directory), /six|Missing/);
  for (const artifact of releaseArtifacts()) await writeFile(join(directory, artifact.name), "artifact");
  await checkArtifactFiles(directory);
  await writeFile(join(directory, "shokher-khabar-admin.aab"), "");
  await assert.rejects(checkArtifactFiles(directory), /empty/);
  await writeFile(join(directory, "shokher-khabar-admin.aab"), "artifact");
  await writeFile(join(directory, "extra.apk"), "artifact");
  await assert.rejects(checkArtifactFiles(directory), /six|Unexpected/);
  assertFingerprint("AA:".repeat(31) + "AA", "aa".repeat(32));
  assert.throws(() => assertFingerprint("aa".repeat(32), "bb".repeat(32)), /fingerprint/);
  assert.throws(() => assertFingerprint("", ""), /fingerprint/);
});
