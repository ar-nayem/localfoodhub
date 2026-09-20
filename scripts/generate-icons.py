"""Generates every app icon from the placeholder "F" monogram in components/brand/Logo.tsx.

Run from the project root:  /usr/bin/python3 scripts/generate-icons.py
(macOS system python3 ships Pillow; a pyenv/homebrew python3 on PATH may not.)

The letter is drawn as three rectangles rather than typeset, so the output is identical on
any machine regardless of installed fonts. Everything is drawn at 4x and downsampled —
PIL's shape drawing has no anti-aliasing, and that is the only way to get clean edges.

When the real logo arrives, replace draw_mark() and re-run; nothing else changes.
"""

from pathlib import Path

from PIL import Image, ImageDraw

PRIMARY = (0x20, 0x69, 0x3F, 255)  # brand.primaryColorHex
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 4

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"


def draw_mark(draw: ImageDraw.ImageDraw, size: int, glyph_height_ratio: float) -> None:
    """The F: one stem, a full top arm and a shorter middle arm."""
    h = size * glyph_height_ratio
    w = h * 0.70
    stem = h * 0.21
    bar = stem * 0.92
    # Optically centred: an F carries all its weight on the left, so centring its bounding
    # box would make it look pushed right inside the tile.
    left = (size - w) / 2 + w * 0.06
    top = (size - h) / 2
    r = stem * 0.18
    draw.rounded_rectangle([left, top, left + stem, top + h], radius=r, fill=WHITE)
    draw.rounded_rectangle([left, top, left + w, top + bar], radius=r, fill=WHITE)
    mid = top + h * 0.46
    draw.rounded_rectangle([left, mid, left + w * 0.76, mid + bar], radius=r, fill=WHITE)


def render(size: int, *, rounded: bool, glyph: float) -> Image.Image:
    big = size * SUPERSAMPLE
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=PRIMARY)
    else:
        draw.rectangle([0, 0, big, big], fill=PRIMARY)
    draw_mark(draw, big, glyph)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    outputs = {
        # purpose "any": the rounded tile, transparent corners, as it appears in-app.
        ICONS / "icon-192.png": render(192, rounded=True, glyph=0.46),
        ICONS / "icon-512.png": render(512, rounded=True, glyph=0.46),
        # purpose "maskable": full bleed. Android crops to a circle/squircle, keeping only
        # the centre 80% — so the glyph stays well inside that safe zone.
        ICONS / "icon-maskable-512.png": render(512, rounded=False, glyph=0.36),
        # iOS home screen rounds its own corners; pre-rounding would double them.
        ICONS / "apple-touch-icon.png": render(180, rounded=False, glyph=0.42),
        # Play Console's store-listing icon: exactly 512x512, full bleed, no pre-rounded
        # corners or shadow — Google applies both itself.
        ICONS / "play-store-512.png": render(512, rounded=False, glyph=0.42),
        # Browser tab favicon. Next.js serves app/icon.png and links it automatically.
        ROOT / "app" / "icon.png": render(64, rounded=True, glyph=0.5),
    }
    for path, img in outputs.items():
        img.save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
