import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Placeholder mark — a monogram in the primary color. Replace this component's contents
 * (and lib/brand.ts) with the real logo once it's provided; every screen that shows the
 * platform name/mark imports from here, so nothing else needs to change. */
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
        {brand.shortName.slice(0, 1)}
      </span>
      {!iconOnly && <span className="text-lg tracking-tight">{brand.name}</span>}
      {!iconOnly && variant === "business" && (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Business
        </span>
      )}
    </span>
  );
}
