import type { Metadata } from "next";

import { ItemPage } from "@/components/lists/item-page";

import { loadItemPage } from "../item-data";

// The item page (docs/02-UX-DESIGN.md, section 2.4), one address for members
// and buyers (design decision 1).

type Props = { params: Promise<{ itemId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item } = await loadItemPage((await params).itemId);
  return { title: item.name };
}

export default async function ItemRoute({ params }: Props) {
  const { user, item, groupId, isMember, lists, listItems } =
    await loadItemPage((await params).itemId);
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
