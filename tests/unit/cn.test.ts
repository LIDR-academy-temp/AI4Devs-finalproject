import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { cn, themeTokens } from "../../src/components/ui/utils";

// cn() and the theme's own text sizes, spacing, and shadows (T-35).

const css = readFileSync(
  new URL("../../src/app/globals.css", import.meta.url),
  "utf8",
);

/** The names of the theme's tokens with a prefix, without their sub-values such as `--line-height`. */
function cssTokens(prefix: string): string[] {
  const names = [...css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):`, "g"))]
    .map((match) => match[1])
    .filter((name) => !name.includes("--"));
  return [...new Set(names)].sort();
}

describe("cn", () => {
  it("T-35 keeps a custom text size and a text color in either order", () => {
    expect(cn("text-body-md", "text-primary")).toBe(
      "text-body-md text-primary",
    );
    expect(cn("text-foreground", "text-label-lg")).toBe(
      "text-foreground text-label-lg",
    );
  });

  it("T-35 lets a later text size replace an earlier one", () => {
    expect(cn("text-label-lg", "text-body-lg")).toBe("text-body-lg");
    expect(cn("text-body-md", "text-sm")).toBe("text-sm");
    expect(cn("text-sm", "text-headline-md")).toBe("text-headline-md");
  });

  it("T-35 keeps a line height that follows a custom text size", () => {
    expect(cn("text-body-md", "leading-tight")).toBe(
      "text-body-md leading-tight",
    );
  });

  it("T-35 lets shadow-none replace a theme shadow", () => {
    expect(cn("shadow-card", "shadow-none")).toBe("shadow-none");
    expect(cn("shadow-floating", "shadow-dialog")).toBe("shadow-dialog");
    expect(cn("shadow-dialog", "shadow-primary")).toBe(
      "shadow-dialog shadow-primary",
    );
  });

  it("T-35 lets a later spacing class replace a theme spacing class", () => {
    expect(cn("px-margin", "px-4")).toBe("px-4");
    expect(cn("p-4", "p-space-lg")).toBe("p-space-lg");
    expect(cn("gap-gutter", "gap-2")).toBe("gap-2");
  });

  it("T-35 registers every text size, spacing, and shadow in globals.css", () => {
    expect([...themeTokens.text].sort()).toEqual(cssTokens("text"));
    expect([...themeTokens.spacing].sort()).toEqual(cssTokens("spacing"));
    expect([...themeTokens.shadow].sort()).toEqual(cssTokens("shadow"));
  });
});
