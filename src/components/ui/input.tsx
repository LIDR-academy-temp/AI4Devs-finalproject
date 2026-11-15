import type { ComponentProps } from "react";

import { cn } from "./utils";

// Inputs from DESIGN.md: at least 50px tall, 14px 16px padding, 17px text
// (which also stops iOS Safari from zooming), and a 1.5px border that turns
// 2px on focus and on error. The padding gives up the extra half pixel, so
// the text doesn't move. Keyboard focus also shows the focus ring (DESIGN.md,
// Focus).
export const fieldClassName =
  "min-h-[50px] w-full rounded-md border-[1.5px] border-input bg-card px-4 py-3.5 text-body-lg text-foreground outline-none placeholder:text-muted-foreground focus:border-2 focus:border-primary focus:px-[calc(1rem-0.5px)] focus:py-[calc(0.875rem-0.5px)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:px-[calc(1rem-0.5px)] aria-invalid:py-[calc(0.875rem-0.5px)] disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(fieldClassName, className)}
      {...props}
    />
  );
}
