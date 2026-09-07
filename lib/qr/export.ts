/**
 * Layer 6: export. Browser-side only.
 *
 * All three formats come from the one SVG string the renderer produced, so a card can
 * never look different across preview, screen and print.
 */

/** Print DPI for raster output. 300 is the standard for anything going on paper. */
const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(URL.createObjectURL(blob), `${filename}.svg`, true);
}

/**
 * Rasterises the SVG at print resolution. The canvas is sized from the template's
 * physical dimensions rather than its viewBox, so a 100×142mm card comes out at the pixel
 * count a 300dpi printer actually wants.
 */
export async function downloadPng(
  svg: string,
  filename: string,
  print: { widthMm: number; heightMm: number }
): Promise<void> {
  const pxWidth = Math.round((print.widthMm / MM_PER_INCH) * PRINT_DPI);
  const pxHeight = Math.round((print.heightMm / MM_PER_INCH) * PRINT_DPI);

  const image = await loadSvgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = pxWidth;
  canvas.height = pxHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, pxWidth, pxHeight);
  ctx.drawImage(image, 0, 0, pxWidth, pxHeight);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not create PNG"));
      triggerDownload(URL.createObjectURL(blob), `${filename}.png`, true);
      resolve();
    }, "image/png");
  });
}

/**
 * PDF via the browser's own print pipeline ("Save as PDF"), with an @page rule set to the
 * template's real millimetre size so the printed card measures correctly — rather than
 * pulling in a PDF library to embed the same vector we already have.
 */
export function printCard(svg: string, print: { widthMm: number; heightMm: number }) {
  const win = window.open("", "_blank", "width=680,height=900");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>QR card</title><style>
    @page { size: ${print.widthMm}mm ${print.heightMm}mm; margin: 0; }
    html, body { margin: 0; padding: 0; }
    svg { display: block; width: ${print.widthMm}mm; height: ${print.heightMm}mm; }
    @media screen { body { background: #f3f3f3; padding: 16px; } }
  </style></head><body>${svg}
  <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
  </body></html>`);
  win.document.close();
}

async function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  // A data URL avoids the tainted-canvas problem that a blob: URL can hit in some
  // browsers, which would make toBlob() throw on export.
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not render the card image"));
    img.src = encoded;
  });
}

function triggerDownload(href: string, filename: string, revoke: boolean) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 2000);
}
