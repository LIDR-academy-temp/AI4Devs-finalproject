import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme's own text sizes, spacing, and shadows (src/app/globals.css), so
// tailwind-merge sorts their classes into the right groups instead of taking
// text-body-md for a color or shadow-card for a shadow color.
export const themeTokens = {
  text: [
    "headline-xl",
    "headline-xl-mobile",
    "headline-lg",
    "headline-md",
    "body-xl",
    "body-lg",
    "body-md",
    "label-lg",
  ],
  spacing: [
    "gutter",
    "gutter-desktop",
    "margin",
    "margin-desktop",
    "space-xs",
    "space-sm",
    "space-md",
    "space-lg",
    "space-xl",
    "space-2xl",
  ],
  shadow: ["card", "floating", "dialog"],
};

const merge = extendTailwindMerge({ extend: { theme: themeTokens } });

/** Joins class names, letting later Tailwind classes override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
