import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

/**
 * Live filesystem-backed serving for uploaded files.
 *
 * Next.js's `next start` scans `public/` exactly once at server boot and caches the file
 * list for its fast static-file path — a file written to `public/uploads/` by a real
 * upload while the server is already running is never in that cached set, so a request
 * for it falls through to page routing and 404s, even though the file is sitting right
 * there on disk. This route reads straight from disk on every request instead, so newly
 * uploaded files are servable immediately, no restart required.
 *
 * `next.config.js` rewrites unmatched `/uploads/:path*` requests here as a fallback —
 * existing DB rows built before this fix, and any client with an old cached page still
 * requesting the old path shape, both keep working with no data migration.
 */

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path ?? [];
  // Reject anything that could escape UPLOADS_ROOT before it ever touches the filesystem.
  if (segments.length === 0 || segments.some((s) => s.includes("..") || s.includes("/") || s.includes("\\"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(UPLOADS_ROOT, ...segments);
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        // Filenames are random hashes — the same URL never points at different content,
        // so this is safe to cache aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
