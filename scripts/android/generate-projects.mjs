import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, rm, readdir, lstat, realpath } from "node:fs/promises";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ANDROID_APPS } from "./apps.mjs";

const require = createRequire(import.meta.url);
const { TwaManifest } = require("@bubblewrap/core");
const root = fileURLToPath(new URL("../../", import.meta.url));
const cliPackage = require.resolve("@bubblewrap/cli/package.json");
const cli = join(dirname(cliPackage), require(cliPackage).bin.bubblewrap);
const iconRoot = join(root, "public/icons");

/** Validate before deleting anything; sources keep portable paths, runtime uses file URIs. */
export async function loadManifest(app) {
  const data = JSON.parse(await readFile(app.manifestPath, "utf8"));
  for (const field of ["packageId", "host", "name", "startUrl"]) {
    if (data[field] !== app[field]) throw new Error(`${field} does not match ANDROID_APPS`);
  }
  const origin = `https://${app.host}`;
  if (!data.startUrl.startsWith("/") || new URL(data.startUrl, origin).origin !== origin) {
    throw new Error("startUrl must be a same-origin HTTPS path");
  }
  if (data.fullScopeUrl !== `${origin}/`) throw new Error("fullScopeUrl must match the HTTPS origin");
  if (typeof data.appVersion !== "string" || !data.appVersion.trim() ||
      !Number.isSafeInteger(data.appVersionCode) || data.appVersionCode < 1) {
    throw new Error("Invalid appVersion or appVersionCode");
  }
  if (data.orientation !== (app.key === "customer" ? "portrait" : "any")) {
    throw new Error("Invalid orientation");
  }
  for (const field of ["iconUrl", "maskableIconUrl"]) {
    const icon = await realpath(resolve(dirname(app.manifestPath), data[field]));
    const location = relative(await realpath(iconRoot), icon);
    if (location.startsWith("..") || isAbsolute(location)) throw new Error(`${field} must be in public/icons`);
    const bytes = await readFile(icon);
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
        bytes.readUInt32BE(16) !== 512 || bytes.readUInt32BE(20) !== 512) {
      throw new Error(`${field} must be a 512px PNG`);
    }
    data[field] = pathToFileURL(icon).href;
  }
  const error = new TwaManifest(data).validate();
  if (error) throw new Error(error);
  return data;
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

/** Discover generated module files; don't assume Bubblewrap's internal resource layout. */
export async function verifyProject(app) {
  const files = await filesUnder(app.projectDir);
  if (!files.includes(join(app.projectDir, "gradlew")) ||
      !files.includes(join(app.projectDir, "settings.gradle"))) {
    throw new Error("Bubblewrap did not produce a Gradle project at the requested directory");
  }
  const modules = await Promise.all(files.filter((file) => file.endsWith("build.gradle"))
    .map(async (file) => ({ file, text: await readFile(file, "utf8") })));
  const matches = modules.filter(({ text }) => text.includes(`applicationId: '${app.packageId}'`));
  if (matches.length !== 1) throw new Error(`Expected one Android module for ${app.packageId}`);
  const gradle = matches[0].text;
  if (!gradle.includes(`applicationId "${app.packageId}"`)) {
    throw new Error(`Generated applicationId does not match ${app.packageId}`);
  }
  for (const expected of [`hostName: '${app.host}'`, `launchUrl: '${app.startUrl}'`, `name: '${app.name}'`]) {
    if (!gradle.includes(expected)) throw new Error(`Generated identity mismatch: ${expected}`);
  }
  return relative(app.projectDir, matches[0].file);
}

async function runBubblewrap(args, cwd) {
  console.log(JSON.stringify([process.execPath, cli, ...args]));
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), 120_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) accept();
      else reject(new Error(`Bubblewrap failed (${signal ?? code})\n${output}`));
    });
  });
}

export async function generateProjects() {
  if (require(cliPackage).version !== "1.25.0") throw new Error("Install pinned @bubblewrap/cli 1.25.0 with npm ci");
  for (const app of ANDROID_APPS) {
    let server;
    try {
      const manifest = await loadManifest(app);
      // Limit cleanup to a registered generated directory, and reject symlinked parents.
      const expected = join(root, "android", app.key, "generated");
      if (resolve(app.projectDir) !== expected || await realpath(dirname(expected)) !== dirname(expected)) {
        throw new Error("Unsafe generated directory");
      }
      const previous = await lstat(expected).catch((error) => {
        if (error.code !== "ENOENT") throw error;
        return null;
      });
      if (previous?.isSymbolicLink()) throw new Error("Refusing a symlinked generated directory");
      await rm(expected, { recursive: true, force: true });
      await mkdir(expected, { recursive: true });

      // 1.25.0 accepts only HTTP(S) icon URLs. Expose only these two checked local files.
      const icons = new Map();
      for (const field of ["iconUrl", "maskableIconUrl"]) {
        icons.set(`/${field}.png`, await readFile(new URL(manifest[field])));
      }
      server = createServer((request, response) => {
        const bytes = icons.get(request.url);
        response.writeHead(bytes ? 200 : 404, { "Content-Type": "image/png" });
        response.end(bytes);
      });
      await new Promise((accept, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", accept);
      });
      const runtimeManifest = { ...manifest };
      for (const field of ["iconUrl", "maskableIconUrl"]) {
        runtimeManifest[field] = `http://127.0.0.1:${server.address().port}/${field}.png`;
      }
      const manifestPath = join(expected, "twa-manifest.json");
      await writeFile(manifestPath, JSON.stringify(runtimeManifest, null, 2) + "\n");
      // `update` never uses the JDK/SDK, but the CLI loads config before dispatching.
      // Keep its generation-only config separate from the user's real build toolchain.
      const configPath = join(root, "android/.bubblewrap/generation-config.json");
      await mkdir(dirname(configPath), { recursive: true });
      await writeFile(configPath, JSON.stringify({ jdkPath: ".", androidSdkPath: "." }) + "\n");
      console.log(`[${app.key}] Generating ${app.packageId}`);
      await runBubblewrap(["update", "--skipVersionUpgrade", "--manifest", manifestPath,
        "--directory", expected, "--config", configPath], expected);

      // Remove the ephemeral server address from persisted inputs and Bubblewrap's checksum.
      const stableManifest = JSON.stringify(manifest, null, 2) + "\n";
      await writeFile(manifestPath, stableManifest);
      await writeFile(join(expected, "manifest-checksum.txt"), createHash("sha1").update(stableManifest).digest("hex"));
      const module = await verifyProject(app);
      console.log(`[${app.key}] Verified ${module}: ${app.packageId}, https://${app.host}${app.startUrl}`);
    } catch (error) {
      throw new Error(`[${app.key}] ${error.message}`, { cause: error });
    } finally {
      if (server?.listening) await new Promise((accept) => server.close(accept));
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  generateProjects().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
