"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** In-app camera QR scanner (spec Section 17). Pure client-side decode via jsQR — no
 * external scanning service. Any of our own QR codes just encode `/q/<token>`, so once
 * jsQR reads the frame we simply navigate there and the server route
 * (app/q/[token]/route.ts) does all the real resolution/validation work. */
export function QrScanner({
  heading = "Scan QR",
  subtitle = "Point your camera at a shop, table, or menu QR code.",
}: {
  heading?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        tick();
      } catch {
        setError("Camera access denied or unavailable. You can enter a code manually below.");
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            handleDecoded(code.data);
            return;
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDecoded(text: string) {
    const match = text.match(/\/q\/([A-Za-z0-9_-]+)/);
    if (match) {
      router.push(`/q/${match[1]}`);
      return;
    }
    setError("This doesn't look like a Local Food Hub QR code.");
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    router.push(`/q/${manualToken.trim()}`);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-6">
      <h1 className="mb-1 text-center text-xl font-bold">{heading}</h1>
      <p className="mb-5 text-center text-sm text-muted-foreground">{subtitle}</p>

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {scanning && (
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
        )}
        {!scanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <Camera size={28} />
            <span className="text-sm">Starting camera...</span>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-center text-sm text-error">{error}</p>}

      <form onSubmit={submitManual} className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <KeyRound size={14} /> Or enter a QR code manually
        </p>
        <div className="flex gap-2">
          <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="QR code" />
          <Button type="submit" variant="outline">
            Go
          </Button>
        </div>
      </form>
    </div>
  );
}
