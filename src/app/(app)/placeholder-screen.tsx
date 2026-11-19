import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { TAB_ICONS } from "@/components/app-shell/tab-icons";
import { EmptyState } from "@/components/screen-states";
import type { Tab } from "@/shared/navigation";

// A tab whose screen isn't built yet (design decision 6 of the T-05 change).
// The ticket that builds the screen replaces its page.
export function PlaceholderScreen({ tab }: { tab: Tab }) {
  const tTabs = useTranslations("tabs");
  const tPlaceholder = useTranslations("placeholder");
  return (
    <>
      <h1 className="text-headline-xl-mobile md:text-headline-xl font-bold">
        {tTabs(tab)}
      </h1>
      <EmptyState icon={TAB_ICONS[tab]}>
        {tPlaceholder("comingSoon")}
      </EmptyState>
    </>
  );
}

/** The page title: the tab's name. */
export async function placeholderMetadata(tab: Tab): Promise<Metadata> {
  const t = await getTranslations("tabs");
  return { title: t(tab) };
}
