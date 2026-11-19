import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ItemFormScreen } from "@/components/lists/item-form-screen";
import { db } from "@/server/db/client";
import { listLists } from "@/server/services/lists";

import { loadShell } from "../../shell-data";

// Add item (docs/02-UX-DESIGN.md, section 2.4; FR-13): for members of the
// current group, with the list from the address or else the first one
// (design decision 1).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("itemForm");
  return { title: t("addTitle") };
}

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string | string[] }>;
}) {
  const { user, currentGroup } = await loadShell();
  // The current group is always one the user is a member of; a user with no
  // such group gets the "not available" state (BR-13).
  if (!currentGroup) notFound();

  const lists = await listLists(db, user.id, currentGroup.groupId);
  const { list: chosen } = await searchParams;
  const list = lists.find(({ id }) => id === chosen) ?? lists[0];
  // Lists offers to create a list first.
  if (!list) redirect("/lists");

  return (
    <ItemFormScreen
      mode="add"
      backHref={`/lists?list=${list.id}`}
      lists={lists}
      listId={list.id}
    />
  );
}
