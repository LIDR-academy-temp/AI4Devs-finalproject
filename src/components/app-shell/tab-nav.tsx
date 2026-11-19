"use client";

import { ShoppingBagIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/components/ui/utils";
import { type Tab, TAB_PATHS } from "@/shared/navigation";

import { TAB_ICONS } from "./tab-icons";

// The user's tabs (FR-08): one navigation element that is a bottom bar below
// 768px and a left sidebar from 768px (design decision 2 of the T-05 change).
// The current tab is marked with color, weight, an indicator bar, and
// aria-current, so color is never the only cue.
//
// Labels stay at 16px and are never cut off, so the bar grows with them
// (DESIGN.md, Navigation). Each tab starts as wide as its label's longest word
// plus 5px on each side, so labels in neighboring tabs stay 10px apart, and
// the space left is shared equally; no tab is narrower than 48px. Labels wrap
// between words; a word breaks only when the longest words don't fit the bar
// together, which doesn't happen from 360px.
//
// + Agregar and the screen's bottom padding sit above the bar's real height,
// which the bar measures into --tab-bar-height. Until it does, they use
// --tab-bar-fallback, the tallest bar the labels can produce (globals.css and
// tabLabelLines in src/shared/navigation.ts), so nothing is covered before the page's
// JavaScript runs.

function isCurrent(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Keeps --tab-bar-height on the page equal to the bar's height, as it changes. */
function useBarHeight() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const height =
        entry?.borderBoxSize?.[0]?.blockSize ??
        bar.getBoundingClientRect().height;
      root.style.setProperty("--tab-bar-height", `${height}px`);
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--tab-bar-height");
    };
  }, []);
  return ref;
}

export function TabNav({ tabs }: { tabs: readonly Tab[] }) {
  const pathname = usePathname();
  const tTabs = useTranslations("tabs");
  const tShell = useTranslations("shell");
  const tCommon = useTranslations("common");
  const ref = useBarHeight();

  return (
    <nav
      ref={ref}
      aria-label={tShell("navigation")}
      className="border-border bg-card shadow-floating fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:left-0 md:w-[272px] md:border-t-0 md:border-r-[1.5px] md:pb-0 md:shadow-none"
    >
      <p className="text-headline-md hidden items-center gap-2 px-6 pt-6 pb-4 font-bold md:flex">
        <ShoppingBagIcon className="text-primary size-7" aria-hidden />
        {tCommon("appName")}
      </p>
      <ul className="flex md:flex-col md:gap-1 md:px-3">
        {tabs.map((tab) => {
          const path = TAB_PATHS[tab];
          const current = isCurrent(pathname, path);
          const Icon = TAB_ICONS[tab];
          return (
            <li
              key={tab}
              className="min-w-12 flex-[1_1_min-content] md:flex-none"
            >
              <Link
                href={path}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "text-body-md focus-visible:ring-ring relative flex min-h-16 flex-col items-center justify-center gap-1 px-1.25 py-2 text-center leading-tight outline-none focus-visible:ring-2 focus-visible:ring-inset md:min-h-12 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-4 md:text-left md:focus-visible:ring-offset-2",
                  current
                    ? "text-primary md:bg-accent font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium",
                )}
              >
                {current && (
                  <span
                    aria-hidden
                    className="bg-primary absolute inset-x-3 top-0 h-1 rounded-b-sm md:inset-x-auto md:inset-y-2 md:left-0 md:h-auto md:w-1 md:rounded-r-sm md:rounded-bl-none"
                  />
                )}
                <Icon className="size-6 shrink-0" aria-hidden />
                <span className="max-w-full break-words">{tTabs(tab)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
