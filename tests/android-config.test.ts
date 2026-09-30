import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("Android app identities match the three production surfaces", async () => {
  const { ANDROID_APPS } = await import("../scripts/android/apps.mjs");
  assert.equal(ANDROID_APPS.length, 3);
  assert.ok(Object.isFrozen(ANDROID_APPS));
  assert.equal(new Set(ANDROID_APPS.map((app) => app.packageId)).size, 3);
  assert.equal(new Set(ANDROID_APPS.map((app) => app.host)).size, 3);
  const expected = [
    ["customer", "শখের খাবার", "top.arnayem.shokherkhabar", "shokherkhabar.arnayem.top", "/"],
    ["business", "শখের খাবার Business", "top.arnayem.shokherkhabar.business", "business.shokherkhabar.arnayem.top", "/vendor"],
    ["admin", "শখের খাবার Admin", "top.arnayem.shokherkhabar.admin", "admin.shokherkhabar.arnayem.top", "/admin"],
  ];
  for (const [index, app] of ANDROID_APPS.entries()) {
    assert.ok(Object.isFrozen(app));
    assert.deepEqual([app.key, app.name, app.packageId, app.host, app.startUrl], expected[index]);
    assert.match(app.startUrl, /^\//);
    const manifest = JSON.parse(await readFile(app.manifestPath, "utf8"));
    for (const field of ["packageId", "host", "name", "startUrl"] as const) {
      assert.equal(manifest[field], app[field], `${app.key}: ${field}`);
    }
    assert.equal(manifest.appVersion, "1.0.0");
    assert.equal(manifest.appVersionCode, 1);
    assert.equal(manifest.orientation, app.key === "customer" ? "portrait" : "any");
  }
});

test("Android project verification discovers modules and rejects a wrong built application ID", async (t) => {
  const { ANDROID_APPS } = await import("../scripts/android/apps.mjs");
  const { verifyProject } = await import("../scripts/android/generate-projects.mjs");
  const directory = await mkdtemp(join(tmpdir(), "android-project-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const app = { ...ANDROID_APPS[0], projectDir: directory };
  await mkdir(join(directory, "nested/launcher"), { recursive: true });
  await writeFile(join(directory, "gradlew"), "");
  await writeFile(join(directory, "settings.gradle"), "");
  const modulePath = join(directory, "nested/launcher/build.gradle");
  const metadata = "applicationId: 'top.arnayem.shokherkhabar',\nhostName: 'shokherkhabar.arnayem.top',\nlaunchUrl: '/',\nname: 'শখের খাবার',\n";
  await writeFile(modulePath, metadata + 'applicationId "wrong.package"\n');
  await assert.rejects(verifyProject(app), /applicationId/);
  await writeFile(modulePath, metadata + 'applicationId "top.arnayem.shokherkhabar"\n');
  assert.equal(await verifyProject(app), "nested/launcher/build.gradle");
});

test("Android generation resolves and validates local icons before replacing projects", async () => {
  const { ANDROID_APPS } = await import("../scripts/android/apps.mjs");
  const { loadManifest } = await import("../scripts/android/generate-projects.mjs");
  for (const app of ANDROID_APPS) {
    const manifest = await loadManifest(app);
    assert.equal(new URL(manifest.iconUrl).protocol, "file:");
    assert.equal(new URL(manifest.fullScopeUrl).origin, `https://${app.host}`);
    await assert.rejects(loadManifest({ ...app, packageId: "wrong.identity" }), /packageId/);
  }
});
