import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Shared wordmark. The customer surface uses the approved bowl-and-leaf brand artwork;
 * Business keeps its compact labeled mark for dense operator screens. */
export function Logo({
  className,
  iconOnly = false,
  variant = "customer",
}: {
  className?: string;
  iconOnly?: boolean;
  /** "business" adds a small label after the name — the Business app's own wordmark. */
  variant?: "customer" | "business";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold", className)}>
      {variant === "customer" ? (
        <Image
          src="/brand/shokher-khabar-customer-main-logo.png"
          alt=""
          width={36}
          height={36}
          className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
          {brand.shortName.slice(0, 1)}
        </span>
      )}
      {!iconOnly && <span className="text-lg tracking-tight">{brand.name}</span>}
      {!iconOnly && variant === "business" && (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Business
        </span>
      )}
    </span>
  );
}
