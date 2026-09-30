import { spawn } from "node:child_process";
import { readFile, writeFile, readdir, stat, mkdir, copyFile, lstat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ANDROID_APPS } from "./apps.mjs";
import { verifyProject } from "./generate-projects.mjs";

export const androidRoot = fileURLToPath(new URL("../../android/", import.meta.url));
export const signingPath = join(androidRoot, "signing.properties");
export const outputRoot = join(androidRoot, "release-output");

export function parseSigningProperties(text) {
  const result = {};
  const fields = ["storeFile", "storePassword", "keyAlias", "keyPassword"];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || /^\s*[#!]/.test(line)) continue;
    const match = /^\s*([A-Za-z]+)\s*=(.*)$/.exec(line);
    if (!match || !fields.includes(match[1])) throw new Error("Malformed signing properties entry");
    if (Object.hasOwn(result, match[1])) throw new Error(`Duplicate signing field: ${match[1]}`);
    result[match[1]] = match[2].trim();
  }
  for (const field of fields) {
    if (!result[field]) throw new Error(`Missing signing field: ${field}`);
    if (/[\x00-\x1f]/.test(result[field])) throw new Error(`Invalid signing field: ${field}`);
  }
  return result;
}

export async function loadSigning() {
  let text;
  try {
    const info = await lstat(signingPath);
    if (!info.isFile() || (info.mode & 0o077)) throw new Error();
    text = await readFile(signingPath, "utf8");
  } catch { throw new Error("Cannot read private signing properties; run android:key or set permissions to 0600"); }
  const signing = parseSigningProperties(text);
  signing.storeFile = resolve(dirname(signingPath), signing.storeFile);
  try {
    const info = await lstat(signing.storeFile);
    if (!info.isFile() || !info.size || (info.mode & 0o077)) throw new Error();
  } catch { throw new Error("Signing keystore must be a nonempty private regular file (0600)"); }
  return signing;
}

export function validateApps(apps) {
  if (new Set(apps.map((app) => app.packageId)).size !== apps.length) throw new Error("Duplicate package IDs");
  if (apps.length !== ANDROID_APPS.length || apps.some((app, index) =>
    ["key", "packageId", "projectDir"].some((field) => app[field] !== ANDROID_APPS[index][field]))) {
    throw new Error("Release app identity does not match ANDROID_APPS");
  }
}

export function releaseArtifacts() {
  return ANDROID_APPS.flatMap((app) => ["apk", "aab"].map((extension) => ({
    app, extension, name: `shokher-khabar-${app.key}.${extension}`,
  })));
}

export function commandOptions({ cwd, env = process.env } = {}) {
  return { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] };
}

/** @param {string} command @param {string[]} args
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv, sensitive?: string[], timeout?: number}} options */
export async function runCommand(command, args, { cwd, env, sensitive = [], timeout = 1_200_000 } = {}) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) throw new Error("Subprocess arguments must be a string array");
  const redact = (text) => sensitive.filter(Boolean).sort((a, b) => b.length - a.length)
    .reduce((value, secret) => value.split(secret).join("[REDACTED]"), String(text));
  return new Promise((accept, reject) => {
    const child = spawn(command, args, commandOptions({ cwd, env }));
    let output = "";
    let timedOut = false;
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
      output = (output + chunk).slice(-2_000_000);
    });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeout);
    child.on("error", () => { clearTimeout(timer); reject(new Error(`Unable to start ${basename(command)}`)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && !timedOut) accept(output);
      else reject(new Error(redact(`${basename(command)} failed (${timedOut ? "timeout" : code})\n${output}`)));
    });
  });
}

async function exists(path) { return stat(path).then((value) => value.isFile(), () => false); }

export async function loadToolchain() {
  // Read only: never change the user's Bubblewrap configuration.
  const config = await readFile(join(homedir(), ".bubblewrap/config.json"), "utf8")
    .then(JSON.parse, (error) => { if (error.code === "ENOENT") return {}; throw error; });
  let javaHome = process.env.JAVA_HOME || config.jdkPath;
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || config.androidSdkPath;
  if (!javaHome || !sdk || javaHome === "." || sdk === ".") throw new Error("Configure a real JAVA_HOME and ANDROID_SDK_ROOT (or Bubblewrap user config)");
  if (await exists(join(javaHome, "Contents/Home/bin/java"))) javaHome = join(javaHome, "Contents/Home");
  for (const tool of ["java", "keytool", "jarsigner"]) {
    if (!await exists(join(javaHome, "bin", tool))) throw new Error(`Missing JDK tool: ${tool}`);
  }
  return { javaHome, sdk, env: { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
    PATH: `${join(javaHome, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH || ""}` } };
}

export async function findSdkTool(sdk, tool) {
  const candidates = [];
  for (const group of ["build-tools", "cmdline-tools"]) {
    const versions = await readdir(join(sdk, group)).catch(() => []);
    versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const version of versions) candidates.push(join(sdk, group, version, tool), join(sdk, group, version, "bin", tool));
  }
  candidates.push(join(sdk, "tools/bin", tool));
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  throw new Error(`Missing Android SDK tool: ${tool}; install Android SDK command-line/build tools`);
}

export function signingEnvironment(toolchain, signing) {
  return { ...toolchain.env, RELEASE_STORE_FILE: signing.storeFile, RELEASE_STORE_PASSWORD: signing.storePassword,
    RELEASE_KEY_ALIAS: signing.keyAlias, RELEASE_KEY_PASSWORD: signing.keyPassword };
}

export function signingSecrets(signing) {
  return [signing.storeFile, basename(signing.storeFile), signingPath, signing.storePassword, signing.keyPassword];
}

async function findOutput(directory, extension) {
  const matches = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(`.${extension}`) && !entry.name.includes("unsigned")) matches.push(file);
    }
  }
  await walk(directory);
  if (matches.length !== 1 || !(await stat(matches[0])).size) throw new Error(`Expected one nonempty signed ${extension} Gradle output`);
  return matches[0];
}

const signingInit = `allprojects { p ->
    p.plugins.withId('com.android.application') {
        p.extensions.getByName('androidComponents').finalizeDsl { android ->
            def releaseSigning = android.signingConfigs.findByName('localUpload') ?: android.signingConfigs.create('localUpload')
            releaseSigning.storeFile = new File(System.getenv('RELEASE_STORE_FILE'))
            releaseSigning.storePassword = System.getenv('RELEASE_STORE_PASSWORD')
            releaseSigning.keyAlias = System.getenv('RELEASE_KEY_ALIAS')
            releaseSigning.keyPassword = System.getenv('RELEASE_KEY_PASSWORD')
            android.buildTypes.getByName('release').signingConfig = releaseSigning
        }
    }
}
`;

export async function buildReleases({ apps = ANDROID_APPS } = {}) {
  validateApps(apps); // Must precede toolchain, signing, and subprocess activity.
  const signing = await loadSigning();
  const sensitive = signingSecrets(signing);
  try {
    const toolchain = await loadToolchain();
    const modules = await Promise.all(apps.map(verifyProject));
    await mkdir(outputRoot, { recursive: true });
    const expected = new Set(releaseArtifacts().map((artifact) => artifact.name));
    if ((await readdir(outputRoot)).some((name) => !expected.has(name))) throw new Error("Unexpected file in release-output; move it before building");
    for (const [index, app] of apps.entries()) {
      console.log(`[${app.key}] Building signed APK and AAB for ${app.packageId}`);
      const initPath = join(app.projectDir, ".release-signing.gradle");
      await writeFile(initPath, signingInit, { mode: 0o600 });
      // Direct Gradle invocation preserves Bubblewrap's normalized manifest/checksum.
      // Signing values are environment-only, never command-line or Gradle property arguments.
      const log = await runCommand(join(app.projectDir, "gradlew"), ["--no-daemon", "--console=plain", "--init-script", initPath,
        "clean", "assembleRelease", "bundleRelease"], { cwd: app.projectDir, env: signingEnvironment(toolchain, signing), sensitive });
      if (!log.includes("BUILD SUCCESSFUL")) throw new Error("Gradle did not report a successful build");
      const moduleDir = dirname(join(app.projectDir, modules[index]));
      for (const extension of ["apk", "aab"]) {
        const source = await findOutput(join(moduleDir, "build/outputs", extension === "apk" ? "apk/release" : "bundle/release"), extension);
        const name = `shokher-khabar-${app.key}.${extension}`;
        const destination = join(outputRoot, name);
        const previous = await lstat(destination).catch((error) => { if (error.code === "ENOENT") return null; throw error; });
        if (previous && !previous.isFile()) throw new Error("Release destination must be a regular file");
        await copyFile(source, destination);
        console.log(`[${app.key}] Collected ${name} (${(await stat(destination)).size} bytes)`);
      }
    }
  } catch (error) {
    throw new Error(sensitive.reduce((message, secret) => message.split(secret).join("[REDACTED]"), error.message));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  buildReleases().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
