import { ITEM_STATUSES, type ItemStatus } from "./requests";

// How Lists orders, groups, and filters a list's items (docs/02-UX-DESIGN.md,
// section 2.4), and which actions a user has on an item for its status
// (section 2.5, within BR-19). Pure functions, so screens only render.

/** The parts of an item these rules read; the API's `Item` has all of them. */
export type ItemFacts = {
  id: string;
  status: ItemStatus;
  createdAt: string;
  recipient: { id: string; name: string } | null;
  buyer: { id: string; name: string } | null;
};

function newestFirst(a: ItemFacts, b: ItemFacts): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Unavailable items first, then the rest newest first; shipped items apart,
 * newest first, for the collapsed section at the end.
 */
export function arrangeItems<T extends ItemFacts>(
  items: readonly T[],
): { open: T[]; shipped: T[] } {
  const open = items
    .filter(({ status }) => status !== "shipped")
    .sort((a, b) => {
      const aFirst = a.status === "unavailable";
      const bFirst = b.status === "unavailable";
      if (aFirst !== bFirst) return aFirst ? -1 : 1;
      return newestFirst(a, b);
    });
  const shipped = items
    .filter(({ status }) => status === "shipped")
    .sort(newestFirst);
  return { open, shipped };
}

/** A person to filter by: a recipient's ID, or `none` for items with no one. */
export type PersonFilter = "all" | "none" | string;

export type StatusFilter = "all" | ItemStatus;

export type Filters = { person: PersonFilter; status: StatusFilter };

export const NO_FILTERS: Filters = { person: "all", status: "all" };

/**
 * The people with items in the list, by name in the page's language, whether
 * some item has no one, and the statuses present in BR-22's order with their
 * counts.
 */
export function filterChoices(items: readonly ItemFacts[], locale: string) {
  const people = new Map<string, string>();
  let hasNoPerson = false;
  const counts = new Map<ItemStatus, number>();
  for (const item of items) {
    if (item.recipient) people.set(item.recipient.id, item.recipient.name);
    else hasNoPerson = true;
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return {
    people: [...people]
      .map(([id, name]) => ({ id, name }))
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name, locale) || (a.id < b.id ? -1 : 1),
      ),
    hasNoPerson,
    statuses: ITEM_STATUSES.filter((status) => counts.has(status)).map(
      (status) => ({ status, count: counts.get(status)! }),
    ),
  };
}

/** The items matching both the person and the status filter. */
export function applyFilters<T extends ItemFacts>(
  items: readonly T[],
  { person, status }: Filters,
): T[] {
  return items.filter(
    (item) =>
      (person === "all" ||
        (person === "none"
          ? item.recipient === null
          : item.recipient?.id === person)) &&
      (status === "all" || item.status === status),
  );
}

export type ItemAction = "reserve" | "edit" | "delete";

export type Viewer = { userId: string; isMember: boolean };

/**
 * The item page's main button, its ⋯ menu, and its secondary actions. The
 * item's own buyer gets their actions with T-12.
 */
export function itemActions(
  item: Pick<ItemFacts, "status" | "buyer">,
  viewer: Viewer,
): {
  main: ItemAction | null;
  menu: ItemAction[];
  secondary: ItemAction[];
} {
  const none = { main: null, menu: [], secondary: [] };
  switch (item.status) {
    case "pending":
      return {
        main: "reserve",
        menu: viewer.isMember ? ["edit", "delete"] : [],
        secondary: [],
      };
    case "reserved":
      if (!viewer.isMember || item.buyer?.id === viewer.userId) return none;
      return { main: null, menu: ["edit"], secondary: [] };
    case "unavailable":
      if (!viewer.isMember) return none;
      return { main: "edit", menu: ["delete"], secondary: [] };
    case "purchased":
    case "shipped":
      return none;
  }
}

/** Whether a member can still edit the item (BR-19). */
export function canEdit(status: ItemStatus): boolean {
  return (
    status === "pending" || status === "reserved" || status === "unavailable"
  );
}
