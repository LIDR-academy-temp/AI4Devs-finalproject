"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "./utils";

// An on/off switch with a 48px tap area around a visible track (DESIGN.md).
export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "border-input bg-muted focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 outline-none before:absolute before:-inset-2 before:content-[''] focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-card shadow-card ring-input pointer-events-none block size-6 translate-x-0.5 rounded-full ring-1 transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:ring-0" />
    </SwitchPrimitive.Root>
  );
}
