import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ItemFormScreen } from "@/components/lists/item-form-screen";
import { ItemPage } from "@/components/lists/item-page";
import { canEdit } from "@/shared/items";

import { loadItemPage } from "../../item-data";

// Edit item (docs/02-UX-DESIGN.md, section 2.4; FR-16), for members. When
// BR-19 no longer allows editing, the address shows the item page, so a stale
// link or a refresh after a conflict never shows a form that can't be saved
// (design decision 1).

type Props = { params: Promise<{ itemId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("itemForm");
  return { title: t("editTitle") };
}

export default async function EditItemPage({ params }: Props) {
  const { user, item, groupId, isMember, lists, listItems } =
    await loadItemPage((await params).itemId);
  if (!isMember) notFound();

  if (!canEdit(item.status)) {
    return (
      <ItemPage
        item={item}
        userId={user.id}
        isMember={isMember}
        groupId={groupId}
        lists={lists}
        listItems={listItems}
      />
    );
  }

  return (
    <ItemFormScreen
      mode="edit"
      backHref={`/items/${item.id}`}
      lists={lists}
      listId={item.listId}
      item={item}
    />
  );
}
