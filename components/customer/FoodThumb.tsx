import { cn } from "@/lib/utils";
import { artworkForFood } from "@/lib/customer/foodArtwork";
import { UtensilsCrossed } from "lucide-react";

export function FoodThumb({
  src,
  label,
  className,
  glyphClassName = "text-4xl",
  rounded = "rounded-2xl",
  preferArtwork = false,
}: {
  src?: string | null;
  label: string;
  className?: string;
  glyphClassName?: string;
  rounded?: string;
  preferArtwork?: boolean;
}) {
  const artwork = artworkForFood(label);
  const displaySrc = preferArtwork && artwork ? artwork : src ?? artwork;

  if (displaySrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={displaySrc} alt={label} className={cn("h-full w-full object-cover", rounded, className)} />
    );
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("flex h-full w-full items-center justify-center bg-primary/10 text-primary", rounded, className)}
    >
      <UtensilsCrossed className={glyphClassName} aria-hidden="true" />
    </div>
  );
}
