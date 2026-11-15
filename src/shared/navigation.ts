// Which tabs a user sees (FR-08, docs/02-UX-DESIGN.md, section 2.2). The
// interface and the server decide it with this one function, from the same
// data that GET /me returns.

export const TABS = ["lists", "people", "group", "toBuy", "purchases"] as const;

export type Tab = (typeof TABS)[number];

export type TabInput = {
  memberships: readonly { type: "member" | "buyer" }[];
  /** The user is the buyer of a reserved or purchased item. */
  hasPurchases: boolean;
};

/**
 * The user's tabs in display order. Lists, People, and Group for a member of
 * any group; To buy for a buyer in any group; My purchases for a buyer, or for
 * anyone with purchases. The "not in any group yet" message depends on having
 * no memberships, not on the tabs: a user whose access ended still gets My
 * purchases for what they have to ship (BR-11).
 */
export function visibleTabs({ memberships, hasPurchases }: TabInput): Tab[] {
  const isMember = memberships.some(({ type }) => type === "member");
  const isBuyer = memberships.some(({ type }) => type === "buyer");
  return TABS.filter((tab) => {
    switch (tab) {
      case "lists":
      case "people":
      case "group":
        return isMember;
      case "toBuy":
        return isBuyer;
      case "purchases":
        return isBuyer || hasPurchases;
    }
  });
}

/** Each tab's address (docs/03-ARCHITECTURE.md, section 2). */
export const TAB_PATHS: Record<Tab, string> = {
  lists: "/lists",
  people: "/people",
  group: "/group",
  toBuy: "/to-buy",
  purchases: "/purchases",
};

/**
 * How many lines of tab label the bottom bar makes room for before it measures
 * itself (DESIGN.md, Navigation; tab-nav.tsx). It's sized for the narrowest
 * screens: from 360px labels take at most two lines, but five tabs on a
 * narrower screen can take three, so with five tabs + Agregar sits higher
 * until the bar measures itself.
 */
export function tabLabelLines(tabCount: number): 2 | 3 {
  return tabCount > 4 ? 3 : 2;
}

/**
 * Where the user starts: their first tab, or Profile when they have none
 * (docs/02-UX-DESIGN.md, section 2.2).
 */
export function mainScreenPath(tabs: readonly Tab[]): string {
  const [first] = tabs;
  return first ? TAB_PATHS[first] : "/profile";
}

/** The cookie that remembers the group chosen in the group selector, on this device. */
export const CURRENT_GROUP_COOKIE = "group";

/**
 * The groups in the order the group selector lists them: by name, ignoring
 * case and accents, the same everywhere. The database's own order depends on
 * its collation, which differs between environments.
 */
export function sortGroupsByName<
  Group extends { groupId: string; groupName: string },
>(groups: readonly Group[]): Group[] {
  return [...groups].sort(
    (a, b) =>
      GROUP_NAME_ORDER.compare(a.groupName, b.groupName) ||
      a.groupId.localeCompare(b.groupId),
  );
}

const GROUP_NAME_ORDER = new Intl.Collator("es", { sensitivity: "base" });

/**
 * The group that Lists, People, and Group show: the remembered one while the
 * user is a member of it, otherwise their first member group by name. The
 * cookie only picks among the user's own groups, so it never grants access
 * (BR-12).
 */
export function chooseCurrentGroup<
  Group extends { groupId: string; groupName: string },
>(
  memberGroups: readonly Group[],
  remembered: string | undefined,
): Group | undefined {
  const chosen = memberGroups.find(({ groupId }) => groupId === remembered);
  if (chosen) return chosen;
  return sortGroupsByName(memberGroups)[0];
}
