import type { ComponentProps } from "react";

import { fieldClassName } from "./input";
import { cn } from "./utils";

// The shadcn/ui textarea, styled like the inputs (DESIGN.md, Input Fields &
// Selectors), three lines tall, growing with its text.
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClassName, "field-sizing-content min-h-28", className)}
      {...props}
    />
  );
}
