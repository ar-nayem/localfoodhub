import { cn } from "@/lib/utils";

/** Image tile with a category-appropriate fallback. Most seeded shops/products have no
 * photo yet, and a grey box in a food app reads as broken — so the fallback is a warm
 * gradient with a large glyph, which stays presentable next to real photography. */
const FALLBACKS: { match: string[]; emoji: string; from: string; to: string }[] = [
  { match: ["biryani", "rice", "bhuna", "curry", "rezala", "bangladeshi", "local"], emoji: "🍛", from: "#F6C177", to: "#E8913A" },
  { match: ["noodle", "chow", "chinese", "street"], emoji: "🍜", from: "#F3D9A4", to: "#D9A441" },
  { match: ["burger", "fast"], emoji: "🍔", from: "#F7CE8A", to: "#E07B39" },
  { match: ["pizza"], emoji: "🍕", from: "#F6C89F", to: "#D96C3F" },
  { match: ["café", "cafe", "coffee", "latte"], emoji: "☕", from: "#D9BFA4", to: "#8C6248" },
  { match: ["juice", "drink", "smoothie", "lassi"], emoji: "🥤", from: "#BFE6C4", to: "#5CA96B" },
  { match: ["dessert", "cake", "bakery", "naan", "bread"], emoji: "🍰", from: "#F3C6CE", to: "#D97D93" },
  { match: ["chicken", "grill", "kebab"], emoji: "🍗", from: "#F2C185", to: "#C96B2E" },
  { match: ["vegetable", "salad", "healthy", "vegan"], emoji: "🥗", from: "#C8E6B0", to: "#6BA84F" },
  { match: ["seafood", "fish", "prawn"], emoji: "🦐", from: "#FBC7B6", to: "#E27A5F" },
];

function fallbackFor(label: string) {
  const l = label.toLowerCase();
  return (
    FALLBACKS.find((f) => f.match.some((m) => l.includes(m))) ?? {
      emoji: "🍽️",
      from: "#EADFCF",
      to: "#C9B79C",
    }
  );
}

export function FoodThumb({
  src,
  label,
  className,
  glyphClassName = "text-4xl",
  rounded = "rounded-2xl",
}: {
  src?: string | null;
  label: string;
  className?: string;
  glyphClassName?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label} className={cn("h-full w-full object-cover", rounded, className)} />
    );
  }
  const fb = fallbackFor(label);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("flex h-full w-full items-center justify-center", rounded, className)}
      style={{ background: `linear-gradient(135deg, ${fb.from}, ${fb.to})` }}
    >
      <span className={glyphClassName}>{fb.emoji}</span>
    </div>
  );
}
