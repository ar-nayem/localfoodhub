"use client";

import { useEffect, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { downloadPng, downloadSvg, printCard } from "@/lib/qr/export";
import { toast } from "@/components/ui/Toast";

/**
 * Full-size view of a saved QR card, rendered through the same template pipeline as the
 * designer — the preview, the PNG and the printed sheet are all the same SVG.
 */
export function QrCardPreview({
  qrCodeId,
  filename,
  onClose,
}: {
  qrCodeId: string;
  filename: string;
  onClose: () => void;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [print, setPrint] = useState<{ widthMm: number; heightMm: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/qr/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeId }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setSvg(d.svg);
        setPrint(d.template.print);
      })
      .catch(() => setFailed(true));
  }, [qrCodeId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold">QR card</p>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-muted/40 p-5">
          {failed ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Couldn&apos;t render this card.</p>
          ) : svg ? (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Rendering...</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-4 py-3">
          <button
            onClick={() => svg && downloadSvg(svg, filename)}
            disabled={!svg}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Download size={14} /> SVG
          </button>
          <button
            onClick={() =>
              svg && print && downloadPng(svg, filename, print).catch(() => toast("PNG export failed", "error"))
            }
            disabled={!svg}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Download size={14} /> PNG
          </button>
          <button
            onClick={() => svg && print && printCard(svg, print)}
            disabled={!svg}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
