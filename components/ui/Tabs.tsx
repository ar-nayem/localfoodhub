"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn("inline-flex gap-1 border-b border-border", className)}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      "whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary",
      className
    )}
    {...props}
  />
);

export const TabsContent = TabsPrimitive.Content;
