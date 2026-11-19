"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "./utils";

// Labels stay visible above their field, in label-lg (DESIGN.md).
export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-label-lg text-foreground flex items-center gap-2 font-semibold select-none",
        className,
      )}
      {...props}
    />
  );
}
