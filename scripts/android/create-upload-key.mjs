import { randomBytes } from "node:crypto";
import { lstat, mkdir, mkdtemp, writeFile, chmod, link, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { androidRoot, signingPath, loadToolchain, runCommand } from "./build-releases.mjs";

export async function createUploadKey({ propertiesPath = signingPath, storePath = join(androidRoot, "upload.jks") } = {}) {
  for (const path of [propertiesPath, storePath]) {
    const info = await lstat(path).catch((error) => { if (error.code === "ENOENT") return null; throw new Error("Cannot inspect signing destination"); });
    if (info) throw new Error("Refusing to overwrite an existing keystore or signing properties file");
  }
  const toolchain = await loadToolchain();
  const password = randomBytes(48).toString("base64url");
  const alias = "shokherkhabar-upload";
  const temporaryRoot = join(dirname(storePath), ".bubblewrap");
  await mkdir(temporaryRoot, { recursive: true });
  const temporary = await mkdtemp(join(temporaryRoot, "upload-key-"));
  try {
    await chmod(temporary, 0o700);
    const temporaryKey = join(temporary, "upload.jks");
    await runCommand(join(toolchain.javaHome, "bin/keytool"), ["-genkeypair", "-noprompt", "-keystore", temporaryKey,
      "-storetype", "JKS", "-storepass:env", "UPLOAD_KEY_PASSWORD", "-keypass:env", "UPLOAD_KEY_PASSWORD",
      "-alias", alias, "-keyalg", "RSA", "-keysize", "4096", "-sigalg", "SHA256withRSA", "-validity", "10000",
      "-dname", "CN=Shokher Khabar Upload, O=Shokher Khabar"], {
      env: { ...toolchain.env, UPLOAD_KEY_PASSWORD: password }, sensitive: [password, temporaryKey, storePath, propertiesPath],
    });
    await chmod(temporaryKey, 0o600);
    const temporaryProperties = join(temporary, "signing.properties");
    await writeFile(temporaryProperties, `storeFile=${relative(dirname(propertiesPath), storePath)}\nstorePassword=${password}\nkeyAlias=${alias}\nkeyPassword=${password}\n`, { flag: "wx", mode: 0o600 });
    // Publish credentials first: no successfully published key can lose its password.
    // Exclusive links refuse races as well as ordinary overwrite attempts.
    await link(temporaryProperties, propertiesPath);
    await link(temporaryKey, storePath);
    console.log(`Upload key created. Back up both private files securely:\n${storePath}\n${propertiesPath}`);
  } catch (error) {
    const message = [password, storePath, propertiesPath, temporary].reduce((value, secret) => value.split(secret).join("[REDACTED]"), error.message);
    throw new Error(`Upload key creation failed; preserve any created signing files. ${message}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  createUploadKey().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
