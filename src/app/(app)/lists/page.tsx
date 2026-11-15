import { ListPlusIcon, MousePointerClickIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  ListColumn,
  sideBySideClassName,
} from "@/components/lists/list-column";
import { NewListButton } from "@/components/lists/list-menu";
import { EmptyState } from "@/components/screen-states";
import { db } from "@/server/db/client";
import { listItems } from "@/server/services/items";
import { listLists } from "@/server/services/lists";

import { requireTab } from "../shell-data";

// Lists (docs/02-UX-DESIGN.md, section 2.4; FR-11): one list of the current
// group, the one in the address or else the first, with its items. From
// 1024px the item side says to choose an item (design decisions 1 and 6).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lists");
  return { title: t("title") };
}

export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string | string[] }>;
}) {
  const t = await getTranslations("lists");
  const { user, currentGroup } = await requireTab("lists");
  // The Lists tab requires a member group, and the current group is one.
  if (!currentGroup) return null;
  const { groupId } = currentGroup;

  const lists = await listLists(db, user.id, groupId);
  const { list: chosen } = await searchParams;
  const list = lists.find(({ id }) => id === chosen) ?? lists[0];

  if (!list) {
    return (
      <>
        <h1 className="text-headline-xl-mobile md:text-headline-xl font-bold">
          {t("title")}
        </h1>
        <EmptyState
          icon={ListPlusIcon}
          action={<NewListButton groupId={groupId} />}
        >
          {t("noLists")}
        </EmptyState>
      </>
    );
  }

  const items = await listItems(
    db,
    user.id,
    list.id,
    {},
    user.language ?? "es",
  );

  return (
    <div data-layout="wide" className={sideBySideClassName}>
      {/* The list menu below names the list; this names the screen. */}
      <h1 className="sr-only">{t("title")}</h1>
      <ListColumn
        groupId={groupId}
        lists={lists}
        list={list}
        items={items}
        userId={user.id}
      />
      {/* Where the item page will open: a dashed slot as tall as the screen
          allows, not another card. */}
      <div className="hidden lg:sticky lg:top-24 lg:block">
        <EmptyState
          icon={MousePointerClickIcon}
          className="bg-background min-h-[min(28rem,calc(100dvh-8rem))] justify-center border-2 border-dashed shadow-none"
        >
          {t("chooseItem")}
        </EmptyState>
      </div>
    </div>
  );
}
