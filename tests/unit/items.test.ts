import { describe, expect, it } from "vitest";

import {
  applyFilters,
  arrangeItems,
  filterChoices,
  type ItemFacts,
  itemActions,
} from "../../src/shared/items";
import type { ItemStatus } from "../../src/shared/requests";

// Lists' order and filters (docs/02-UX-DESIGN.md, section 2.4) and the item
// page's actions (section 2.5, BR-19).

const ana = { id: "user-ana", name: "Ana" };
const juan = { id: "user-juan", name: "Juan" };
const anthony = { id: "person-anthony", name: "Anthony" };
const grandma = { id: "person-grandma", name: "Abuela" };

function item(
  id: string,
  status: ItemStatus,
  day: number,
  extra: Partial<ItemFacts> = {},
): ItemFacts {
  return {
    id,
    status,
    createdAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    recipient: null,
    buyer: null,
    ...extra,
  };
}

describe("arrangeItems", () => {
  it("T-10 the order of items", () => {
    const items = [
      item("pending-old", "pending", 1),
      item("shipped-old", "shipped", 2),
      item("unavailable-old", "unavailable", 3),
      item("reserved", "reserved", 4),
      item("purchased", "purchased", 5),
      item("unavailable-new", "unavailable", 6),
      item("shipped-new", "shipped", 7),
      item("pending-new", "pending", 8),
      // Same time as pending-new: the ID decides, so the order is stable.
      item("pending-tie", "pending", 8),
    ];

    const { open, shipped } = arrangeItems(items);

    expect(open.map(({ id }) => id)).toEqual([
      "unavailable-new",
      "unavailable-old",
      "pending-tie",
      "pending-new",
      "purchased",
      "reserved",
      "pending-old",
    ]);
    expect(shipped.map(({ id }) => id)).toEqual(["shipped-new", "shipped-old"]);
    expect(arrangeItems([...items].reverse())).toEqual({ open, shipped });
  });
});

describe("filterChoices", () => {
  const items = [
    item("a", "pending", 1, { recipient: anthony }),
    item("b", "reserved", 2, { recipient: grandma, buyer: juan }),
    item("c", "pending", 3, { recipient: anthony }),
    item("d", "pending", 4),
  ];

  it("T-10 the filter choices come from the list", () => {
    expect(filterChoices(items, "es")).toEqual({
      people: [grandma, anthony],
      hasNoPerson: true,
      statuses: [
        { status: "pending", count: 3 },
        { status: "reserved", count: 1 },
      ],
    });
    expect(filterChoices(items.slice(0, 3), "es").hasNoPerson).toBe(false);
  });

  it("T-10 both filters apply together", () => {
    const ids = (filters: Parameters<typeof applyFilters>[1]) =>
      applyFilters(items, filters).map(({ id }) => id);

    expect(ids({ person: "all", status: "all" })).toEqual(["a", "b", "c", "d"]);
    expect(ids({ person: anthony.id, status: "all" })).toEqual(["a", "c"]);
    expect(ids({ person: "none", status: "all" })).toEqual(["d"]);
    expect(ids({ person: "all", status: "reserved" })).toEqual(["b"]);
    expect(ids({ person: grandma.id, status: "pending" })).toEqual([]);
  });
});

describe("itemActions", () => {
  const member = { userId: ana.id, isMember: true };
  const buyer = { userId: juan.id, isMember: false };
  const reservedByJuan = { status: "reserved", buyer: juan } as const;

  it("BR-19 which actions each status allows", () => {
    expect(itemActions({ status: "pending", buyer: null }, member)).toEqual({
      main: "reserve",
      menu: ["edit", "delete"],
      secondary: [],
    });
    expect(itemActions(reservedByJuan, member)).toEqual({
      main: null,
      menu: ["edit"],
      secondary: [],
    });
    expect(itemActions({ status: "unavailable", buyer: juan }, member)).toEqual(
      { main: "edit", menu: ["delete"], secondary: [] },
    );
    for (const status of ["purchased", "shipped"] as const) {
      expect(itemActions({ status, buyer: juan }, member)).toEqual({
        main: null,
        menu: [],
        secondary: [],
      });
    }

    // A buyer reserves pending items, and never gets Edit or Delete.
    expect(itemActions({ status: "pending", buyer: null }, buyer)).toEqual({
      main: "reserve",
      menu: [],
      secondary: [],
    });
    for (const status of [
      "reserved",
      "purchased",
      "shipped",
      "unavailable",
    ] as const) {
      expect(itemActions({ status, buyer: ana }, buyer)).toEqual({
        main: null,
        menu: [],
        secondary: [],
      });
    }

    // The item's own buyer gets their actions with T-12, even as a member.
    expect(
      itemActions(reservedByJuan, { userId: juan.id, isMember: true }),
    ).toEqual({ main: null, menu: [], secondary: [] });
  });
});
