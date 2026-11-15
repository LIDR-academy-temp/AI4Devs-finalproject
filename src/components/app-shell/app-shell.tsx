import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";

import { NoGroupNotice } from "@/components/screen-states";
import type { Tab } from "@/shared/navigation";

import { GroupSelector } from "./group-selector";
import { RefreshButton } from "./refresh-button";
import { TabNav } from "./tab-nav";
import { UserAvatar } from "./user-avatar";

// The frame of every screen for a signed-in user (docs/02-UX-DESIGN.md,
// section 2.2; DESIGN.md, Layout & Spacing): a header with the group, Refresh,
// and the avatar; the tabs; and the screen in a column up to 640px wide, or
// 1120px from 1024px for a screen marked data-layout="wide", which shows the
// list and the item side by side (DESIGN.md, Responsive Layout Model). The
// header row follows the same width, so its ends line up with the content.

/** Up to two initials from the user's name, or the first letter of their email. */
export function initialsOf(name: string | null, email: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0]);
  if (letters.length > 0) return letters.join("").toLocaleUpperCase();
  const first = Array.from(email ?? "")[0];
  return first ? first.toLocaleUpperCase() : "?";
}

/**
 * The most lines a tab label can take at 360px with this many tabs, which sets
 * the bottom bar's height before it measures itself (tab-nav.tsx).
 */
export function tabLabelLines(tabCount: number): 2 | 3 {
  return tabCount > 4 ? 3 : 2;
}

export function AppShell({
  tabs,
  memberGroups,
  currentGroupId,
  inAnyGroup,
  initials,
  children,
}: {
  tabs: readonly Tab[];
  memberGroups: readonly { groupId: string; groupName: string }[];
  currentGroupId: string | undefined;
  inAnyGroup: boolean;
  initials: string;
  children: ReactNode;
}) {
  const t = useTranslations("shell");
  return (
    <div
      data-app-shell
      className="group/shell min-h-dvh md:pl-[272px]"
      style={
        { "--tab-label-lines": tabLabelLines(tabs.length) } as CSSProperties
      }
    >
      <a
        href="#content"
        className="bg-primary text-label-lg text-primary-foreground focus-visible:ring-ring sr-only z-50 rounded-lg px-4 py-3 font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {t("skipToContent")}
      </a>
      <header className="bg-background/95 shadow-floating sticky top-0 z-30 backdrop-blur">
        <div className="px-margin md:px-margin-desktop mx-auto flex min-h-16 w-full max-w-[640px] items-center gap-2 py-2 lg:group-has-[[data-layout=wide]]/shell:max-w-[1120px]">
          <div className="flex min-w-0 flex-1">
            <GroupSelector
              memberGroups={memberGroups}
              currentGroupId={currentGroupId}
            />
          </div>
          <RefreshButton />
          <UserAvatar initials={initials} />
        </div>
      </header>
      <TabNav tabs={tabs} />
      <main
        id="content"
        tabIndex={-1}
        className="px-margin md:px-margin-desktop mx-auto flex w-full max-w-[640px] flex-col gap-6 pt-6 pb-[calc(var(--tab-bar-height,var(--tab-bar-fallback))+2rem)] outline-none md:pb-10 lg:has-[[data-layout=wide]]:max-w-[1120px]"
      >
        {!inAnyGroup && <NoGroupNotice />}
        {children}
      </main>
    </div>
  );
}
