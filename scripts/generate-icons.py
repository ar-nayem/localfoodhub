"""Generates every app icon from the "শ" (first letter of শখের খাবার) monogram in
components/brand/Logo.tsx.

Run from the project root:  /usr/bin/python3 scripts/generate-icons.py
(macOS system python3 ships Pillow; a pyenv/homebrew python3 on PATH may not.)

Earlier Latin monograms ("H", "F") were drawn as raw rectangles so the output was font-
independent. Bengali script can't be approximated that way — a consonant like শ is a real
curve, not a shape rectangles can fake — so this renders actual type instead, via Kohinoor
Bangla, which macOS ships system-wide (System/Library/Fonts/KohinoorBangla.ttc). If this
script ever needs to run on a machine without it, point FONT_PATH at any Bengali-capable
font file (e.g. Noto Sans Bengali) instead.

Everything is drawn at 4x and downsampled for anti-aliased edges, same as before.

MONOGRAM_SOURCE must be kept in sync with lib/brand.ts's `name` by hand — this script has
no access to the TypeScript file, so a rebrand means updating the string below too.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PRIMARY = (0x20, 0x69, 0x3F, 255)  # brand.primaryColorHex
WHITE = (255, 255, 255, 255)
SUPERSAMPLE = 4

FONT_PATH = "/System/Library/Fonts/KohinoorBangla.ttc"
FONT_INDEX = 3  # 0=Regular 1=Semibold 2=Medium 3=Bold — bold reads best at icon sizes

MONOGRAM_SOURCE = "শখের খাবার"  # keep in sync with lib/brand.ts's `brand.name`
GLYPH = MONOGRAM_SOURCE[0]

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"


def draw_mark(draw: ImageDraw.ImageDraw, size: int, glyph_height_ratio: float) -> None:
    font = ImageFont.truetype(FONT_PATH, int(size * glyph_height_ratio), index=FONT_INDEX)
    # anchor="mm" centres on font metrics, not visual ink — Bengali glyph metrics run a
    # little high relative to a Latin baseline, so this nudges down slightly to compensate.
    # Checked by eye against a rendered sample, not derived analytically.
    draw.text((size / 2, size / 2 + size * 0.03), GLYPH, font=font, fill=WHITE, anchor="mm")


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
        ICONS / "icon-192.png": render(192, rounded=True, glyph=0.5),
        ICONS / "icon-512.png": render(512, rounded=True, glyph=0.5),
        # purpose "maskable": full bleed. Android crops to a circle/squircle, keeping only
        # the centre 80% — so the glyph stays well inside that safe zone.
        ICONS / "icon-maskable-512.png": render(512, rounded=False, glyph=0.4),
        # iOS home screen rounds its own corners; pre-rounding would double them.
        ICONS / "apple-touch-icon.png": render(180, rounded=False, glyph=0.46),
        # Play Console's store-listing icon: exactly 512x512, full bleed, no pre-rounded
        # corners or shadow — Google applies both itself.
        ICONS / "play-store-512.png": render(512, rounded=False, glyph=0.46),
        # Browser tab favicon. Next.js serves app/icon.png and links it automatically.
        ROOT / "app" / "icon.png": render(64, rounded=True, glyph=0.54),
    }
    for path, img in outputs.items():
        img.save(path, "PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
