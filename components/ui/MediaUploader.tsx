"use client";

import { useRef, useState } from "react";
import { Upload, X, RefreshCw, ImageOff, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

type UploadState = "empty" | "uploading" | "ready" | "failed";

export interface MediaUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Where the file POSTs to — must accept multipart FormData with a `file` field. */
  uploadEndpoint: string;
  /** Extra form fields sent alongside the file, e.g. `{ shopId, type: "FOOD" }`. */
  extraFields: Record<string, string>;
  shape?: "square" | "wide" | "round";
  label?: string;
  /** Opens an external "choose existing image" picker — omit to hide that option. */
  onBrowseLibrary?: () => void;
}

const SHAPE_CLASS: Record<NonNullable<MediaUploaderProps["shape"]>, string> = {
  square: "aspect-square w-32",
  wide: "aspect-[16/9] w-full",
  round: "h-24 w-24 rounded-full",
};

/**
 * Universal image upload control (spec Section 151-190): local-device upload is the
 * primary and only method exposed here — there's no "Image URL" text field. Drag & drop
 * on desktop, tap-to-browse (which opens the native camera/photo-library picker) on
 * mobile. One component reused everywhere an image is needed — shop logo/banner, food
 * photos, category images, promotion images — instead of duplicating upload logic per
 * screen (spec Section 188's `<MediaUploader />`).
 */
export function MediaUploader({
  value,
  onChange,
  uploadEndpoint,
  extraFields,
  shape = "square",
  label,
  onBrowseLibrary,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>(value ? "ready" : "empty");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setState("failed");
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState("failed");
      setError("Image is too large. Maximum size is 10MB.");
      return;
    }

    setState("uploading");
    setError(null);
    const body = new FormData();
    body.append("file", file);
    for (const [key, val] of Object.entries(extraFields)) body.append(key, val);

    try {
      const res = await fetch(uploadEndpoint, { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed. Please try again.");
      }
      const media = await res.json();
      onChange(media.url);
      setState("ready");
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      toast("Upload failed", "error");
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  function remove() {
    onChange(null);
    setState("empty");
    setError(null);
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden border border-dashed bg-muted text-center transition-colors",
          SHAPE_CLASS[shape],
          dragOver ? "border-primary bg-primary/5" : "border-border",
          state === "ready" && "border-solid"
        )}
      >
        {state === "ready" && value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 p-1 opacity-0 transition-opacity hover:opacity-100">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md bg-white/90 p-1 text-foreground"
                aria-label="Replace image"
              >
                <RefreshCw size={13} />
              </button>
              <button
                type="button"
                onClick={remove}
                className="rounded-md bg-white/90 p-1 text-error"
                aria-label="Remove image"
              >
                <X size={13} />
              </button>
            </div>
          </>
        ) : state === "uploading" ? (
          <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Uploading...
          </div>
        ) : state === "failed" ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-1 px-2 text-xs text-error"
          >
            <ImageOff size={18} />
            <span>{error}</span>
            <span className="font-medium underline">Try again</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-1 px-2 text-xs text-muted-foreground"
          >
            <Upload size={18} />
            <span className="font-medium text-foreground">Upload image</span>
            {shape === "wide" && <span>Drag & drop, or click to browse</span>}
          </button>
        )}
      </div>

      {onBrowseLibrary && (
        <button
          type="button"
          onClick={onBrowseLibrary}
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary"
        >
          <FolderOpen size={12} /> Choose from library
        </button>
      )}

      {/* No `capture` attribute: on iOS that can skip straight to the camera and hide
          the Photo Library option — leaving it off keeps the OS's normal chooser
          (Camera / Photo Library / Files), matching spec Section 170. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
