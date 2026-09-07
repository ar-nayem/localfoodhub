"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/explore?q=${encodeURIComponent(value)}`);
      }}
      className="relative"
    >
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search shops or food..."
        className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    </form>
  );
}
