"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/explore?q=${encodeURIComponent(value)}`);
      }}
      className="relative rounded-full"
    >
      <Search size={20} strokeWidth={2.25} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for food, shops, or cuisines..."
        className="h-14 w-full rounded-full border border-primary/15 bg-surface pl-12 pr-14 text-sm shadow-[0_10px_28px_rgba(18,74,49,0.10)] transition duration-300 placeholder:text-muted-foreground/80 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(18,74,49,0.14)] focus:outline-none focus:ring-2 focus:ring-primary/35 sm:rounded-2xl"
      />
      <span className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <SlidersHorizontal size={18} strokeWidth={2.25} />
      </span>
    </form>
  );
}
