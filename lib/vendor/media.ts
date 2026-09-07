import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a menu photo, keeps local disk sane

/**
 * Saves an uploaded image to /public/uploads/<shopId>/ and returns its public URL.
 * Local-disk storage for this pass — no cloud bucket, no resizing/optimization pipeline
 * (spec Section 103 is explicitly deferred, see README). Swapping to S3/Cloudinary later
 * means changing only this function's body.
 */
export async function saveUploadedImage(file: File, shopId: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported image type — use PNG, JPG, WEBP, or SVG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  const filename = `${randomBytes(8).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", shopId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${shopId}/${filename}`;
}
