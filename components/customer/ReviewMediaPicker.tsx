"use client";

import { useRef, useState } from "react";
import { Plus, X, Video as VideoIcon } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export interface ReviewMediaItem {
  type: "IMAGE" | "VIDEO";
  url: string;
  mimeType?: string;
  fileSize?: number;
}

/** Photo grid (up to 10) + a single optional video slot for the review composer (spec
 * Section 197-201). Local-device upload only — no URL field anywhere here, matching the
 * universal upload philosophy. Uses /api/reviews/media, which re-validates the requester
 * actually owns a COMPLETED order containing this item before saving anything. */
export function ReviewMediaPicker({
  orderItemId,
  photos,
  onPhotosChange,
  video,
  onVideoChange,
  maxPhotos = 10,
}: {
  orderItemId: string;
  photos: ReviewMediaItem[];
  onPhotosChange: (photos: ReviewMediaItem[]) => void;
  video: ReviewMediaItem | null;
  onVideoChange: (video: ReviewMediaItem | null) => void;
  maxPhotos?: number;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  async function uploadOne(file: File, kind: "image" | "video"): Promise<ReviewMediaItem | null> {
    const body = new FormData();
    body.append("file", file);
    body.append("orderItemId", orderItemId);
    body.append("kind", kind);
    const res = await fetch("/api/reviews/media", { method: "POST", body });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Upload failed", "error");
      return null;
    }
    return res.json();
  }

  async function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = maxPhotos - photos.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingPhoto(true);
    const results: ReviewMediaItem[] = [];
    for (const file of toUpload) {
      const saved = await uploadOne(file, "image");
      if (saved) results.push(saved);
    }
    setUploadingPhoto(false);
    if (results.length > 0) onPhotosChange([...photos, ...results]);
  }

  async function handleVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const saved = await uploadOne(file, "video");
    setUploadingVideo(false);
    if (saved) onVideoChange(saved);
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        Photos {photos.length > 0 && `(${photos.length}/${maxPhotos})`}
      </p>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onPhotosChange(photos.filter((_, idx) => idx !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              aria-label="Remove photo"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-muted-foreground"
          >
            {uploadingPhoto ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <Plus size={16} />
                <span className="text-[10px]">Add</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => handlePhotos(e.target.files)}
      />

      <p className="mb-1.5 mt-4 text-xs font-medium text-muted-foreground">Video (optional)</p>
      {video ? (
        <div className="relative w-40">
          <video src={video.url} controls className="w-40 rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => onVideoChange(null)}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
            aria-label="Remove video"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploadingVideo}
          className="flex h-16 w-40 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-muted-foreground"
        >
          {uploadingVideo ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <>
              <VideoIcon size={16} />
              <span className="text-[10px]">Add video</span>
            </>
          )}
        </button>
      )}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        hidden
        onChange={(e) => handleVideo(e.target.files)}
      />
    </div>
  );
}
