import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // spec Section 157: 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // spec Section 200: 100MB

export interface SavedFile {
  url: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Saves an uploaded image or video to /public/uploads/<ownerId>/ and returns its public
 * URL + basic metadata. Local-disk storage for this pass — no cloud bucket, no
 * transcoding/compression/thumbnail-generation pipeline (spec Sections 160/201 are
 * explicitly deferred, see README). Swapping to S3/Cloudinary/a real media service later
 * means changing only this function's body — every caller already goes through here
 * rather than writing files directly.
 */
export async function saveUploadedFile(
  file: File,
  ownerId: string,
  kind: "image" | "video"
): Promise<SavedFile> {
  const allowed = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (!allowed.has(file.type)) {
    throw new Error(
      kind === "image"
        ? "Please upload a JPG, PNG, or WEBP image."
        : "Please choose a supported video (MP4, MOV, or WEBM)."
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      kind === "image"
        ? "Image is too large. Maximum size is 10MB."
        : "Video is too large. Maximum size is 100MB."
    );
  }

  const ext = file.type.split("/")[1].replace("quicktime", "mov");
  const filename = `${randomBytes(8).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", ownerId);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/${ownerId}/${filename}`, mimeType: file.type, fileSize: file.size };
}
