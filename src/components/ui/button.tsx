import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "./utils";

// Buttons from DESIGN.md: at least 48px tall (52px for primary actions),
// 16px semibold text, an icon next to the text, and a visible focus ring.
const buttonVariants = cva(
  "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-label-lg font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "min-h-13 bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border-2 border-border bg-card text-foreground hover:bg-muted",
        // DESIGN.md, WhatsApp Action Color: the brand greens fail contrast
        // with white text.
        whatsapp:
          "min-h-13 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp-hover",
        destructive:
          "border-[1.5px] border-destructive-border bg-destructive-surface text-destructive hover:bg-destructive-surface/70",
        link: "min-h-12 px-2 text-primary underline underline-offset-4 hover:text-primary-hover",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
