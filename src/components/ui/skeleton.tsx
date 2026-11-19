import type { ComponentProps } from "react";

import { cn } from "./utils";

// The shadcn/ui skeleton: a muted block standing in for content while it
// loads (docs/02-UX-DESIGN.md, section 2.7). It pulses only when the user
// hasn't asked for less motion.
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("bg-muted rounded-lg motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
