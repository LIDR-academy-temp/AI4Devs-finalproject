import { expect, type Page, test } from "@playwright/test";

import { seedIds } from "../../scripts/seed-data";
import {
  createItem,
  createList,
  deleteList,
  expectNoAccessibilityViolations,
  type Language,
  messages,
  myGroup,
  setItemStatus,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// The Lists screen (docs/02-UX-DESIGN.md, section 2.4; FR-11, FR-12, FR-13):
// the list menu, quick add, items in order with their status, filters, + Add,
// Refresh, and the desktop layout. Scenarios on the seed's statuses sign in as
// Ana and only look; the others sign up their own user.

function lists(page: Page, language: Language) {
  const t = messages[language];
  return {
    t,
    listMenu: page.getByRole("button", {
      name: new RegExp(`^${t.lists.listMenu}`),
    }),
    listHeading: (name: string) =>
      page.getByRole("heading", { level: 2, name: new RegExp(name) }),
    quickField: page.getByLabel(t.lists.quickAdd),
    item: (name: string) => page.getByRole("link", { name: new RegExp(name) }),
    /** The item rows: list items that open an item. */
    items: page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ has: page.getByRole("link") }),
    /** Shows or hides the shipped items; the Shipped filter has the same name but doesn't expand. */
    shippedToggle: (count: number) =>
      page
        .getByRole("button", {
          name: t.lists.shipped.replace("{count}", String(count)),
        })
        .and(page.locator("[aria-expanded]")),
    filter: (group: "byPerson" | "byStatus", name: string) =>
      page
        .getByRole("group", { name: t.lists[group] })
        .getByRole("button", { name: new RegExp(`^${name}`) }),
    addItem: page.getByRole("link", { name: t.lists.addItem }),
    newListDialog: page.getByRole("dialog", { name: t.lists.newList }),
    refresh: page.getByRole("button", { name: t.shell.refresh }),
  };
}

/** Opens a screen once its controls can take input (see app-shell.spec.ts). */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("quick add", () => {
  test("AC-38 a member types only a name and saves", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await screen.quickField.fill("Milk");
    await screen.quickField.press("Enter");

    await expect(screen.item("Milk")).toContainText(screen.t.status.pending);
    await expect(screen.quickField).toHaveValue("");
    await expect(screen.quickField).toBeFocused();
  });

  test("BR-32 quick add with an empty name", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await screen.quickField.press("Enter");

    await expect(screen.quickField).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByText(screen.t.fieldMessages.nameRequired),
    ).toBeVisible();
    await expect(page.getByText(screen.t.lists.noItems)).toBeVisible();
  });

  test("T-10 quick add keeps the text when the save fails", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");
    await page.route("**/api/v1/lists/*/items", (route) => route.abort());

    await screen.quickField.fill("Milk");
    await screen.quickField.press("Enter");

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      screen.t.common.couldNotSave,
    );
    await expect(screen.quickField).toHaveValue("Milk");
  });
});

test.describe("lists", () => {
  test("T-10 a new member lands on their first list", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await expect(
      screen.listHeading(screen.t.groups.startingListName),
    ).toBeVisible();
    await expect(page.getByText(screen.t.lists.noItems)).toBeVisible();
  });

  test("T-10 a list from another group in the address shows the first list", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, `/lists?list=${seedIds.lists.birthday}`);
    const screen = lists(page, "en");

    await expect(
      screen.listHeading(screen.t.groups.startingListName),
    ).toBeVisible();
    await expect(page.getByText("Anthony's birthday")).toHaveCount(0);
    await expect(page.getByText("Running shoes")).toHaveCount(0);
  });

  test("T-10 a member switches to another list", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const { groupId } = await myGroup(page);
    const medicine = await createList(page, groupId, "Medicine");
    await createItem(page, medicine.id, { name: "Aspirin" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await screen.listMenu.click();
    await page.getByRole("menuitemradio", { name: "Medicine" }).click();

    await expect(page).toHaveURL(`/lists?list=${medicine.id}`);
    await expect(screen.listHeading("Medicine")).toBeVisible();
    await expect(screen.item("Aspirin")).toBeVisible();
    await screen.refresh.click();
    await expect(screen.item("Aspirin")).toBeVisible();
    await expect(page).toHaveURL(`/lists?list=${medicine.id}`);
  });

  test("FR-12 a member creates a list from the list menu", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await screen.listMenu.click();
    await page.getByRole("menuitem", { name: screen.t.lists.newList }).click();
    await screen.newListDialog
      .getByLabel(screen.t.lists.listName)
      .fill("Medicine");
    await screen.newListDialog
      .getByRole("button", { name: screen.t.lists.create })
      .click();

    await expect(screen.newListDialog).toBeHidden();
    await expect(screen.listHeading("Medicine")).toBeVisible();
    await expect(page.getByText(screen.t.lists.noItems)).toBeVisible();
    await screen.listMenu.click();
    await expect(
      page.getByRole("menuitemradio", { name: "Medicine" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("BR-32 an empty list name isn't created", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = lists(page, "en");

    await screen.listMenu.click();
    await page.getByRole("menuitem", { name: screen.t.lists.newList }).click();
    await screen.newListDialog
      .getByRole("button", { name: screen.t.lists.create })
      .click();

    const name = screen.newListDialog.getByLabel(screen.t.lists.listName);
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toBeFocused();
    await expect(
      screen.newListDialog.getByText(screen.t.fieldMessages.nameRequired),
    ).toBeVisible();
    expect((await myGroup(page)).lists).toHaveLength(1);
  });

  test("T-10 a group with no lists", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await deleteList(first!.id);
    await open(page, "/lists");
    const screen = lists(page, "en");

    await expect(page.getByText(screen.t.lists.noLists)).toBeVisible();
    await page.getByRole("button", { name: screen.t.lists.newList }).click();
    await expect(screen.newListDialog).toBeVisible();
  });
});

test.describe("items", () => {
  test("T-10 the seed lists show every status in order", async ({ page }) => {
    await signInAsSeedUser(page, "ana");
    await open(page, "/lists");
    const screen = lists(page, "en");
    const { t } = screen;

    await expect(screen.listHeading("Anthony's birthday")).toBeVisible();
    await expect(screen.item("Running shoes")).toContainText(
      t.item.reservedBy.replace("{name}", "Juan"),
    );
    await expect(screen.item("Backpack")).toContainText(
      t.item.purchasedBy.replace("{name}", "Juan"),
    );
    const shipped = screen.shippedToggle(2);
    await expect(shipped).toHaveAttribute("aria-expanded", "false");
    await expect(screen.item("T-shirt")).toBeHidden();
    await shipped.click();
    await expect(shipped).toHaveAttribute("aria-expanded", "true");
    await expect(screen.item("T-shirt")).toContainText(t.status.shipped);
    await expect(screen.item("Socks")).toBeVisible();

    await screen.listMenu.click();
    await page.getByRole("menuitemradio", { name: "Medicine" }).click();
    await expect(screen.listHeading("Medicine")).toBeVisible();
    await expect(screen.items.first()).toContainText("Ibuprofen");
    await expect(screen.items.first()).toContainText(t.status.unavailable);
  });

  test("T-10 tapping an item opens its page", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    const item = await createItem(page, first!.id, { name: "Milk" });
    await open(page, "/lists");

    await lists(page, "en").item("Milk").click();

    await expect(page).toHaveURL(`/items/${item.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Milk" }),
    ).toBeVisible();
  });

  test("T-10 a member filters by person and by status", async ({ page }) => {
    await signInAsSeedUser(page, "ana");
    await open(page, "/lists");
    const screen = lists(page, "en");
    const { t } = screen;
    await expect(screen.items).toHaveCount(3);

    await screen.filter("byPerson", "Anthony").click();
    await expect(screen.filter("byPerson", "Anthony")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await screen.filter("byStatus", t.status.reserved).click();

    await expect(screen.items).toHaveCount(1);
    await expect(screen.items.first()).toContainText("Running shoes");

    await screen.filter("byPerson", t.lists.all).click();
    await screen.filter("byStatus", t.lists.all).click();
    await expect(screen.items).toHaveCount(3);
  });

  test("T-10 filters that match no item say so", async ({ page }) => {
    await signInAsSeedUser(page, "ana");
    await open(page, `/lists?list=${seedIds.lists.medicine}`);
    const screen = lists(page, "en");
    const { t } = screen;
    await expect(page.getByText(t.lists.noMatches)).toHaveCount(0);

    await screen.filter("byPerson", "Grandma").click();
    await screen.filter("byStatus", t.status.pending).click();

    await expect(screen.items).toHaveCount(0);
    await expect(page.getByText(t.lists.noMatches)).toBeVisible();
  });

  test("T-10 + Add opens the form for the current list", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const { groupId } = await myGroup(page);
    const medicine = await createList(page, groupId, "Medicine");
    await open(page, `/lists?list=${medicine.id}`);

    await lists(page, "en").addItem.click();

    await expect(page).toHaveURL(`/items/new?list=${medicine.id}`);
    await expect(page.getByLabel(messages.en.itemForm.list)).toHaveValue(
      medicine.id,
    );
  });

  test("T-10 Refresh shows an item added elsewhere", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const { groupId } = await myGroup(page);
    const medicine = await createList(page, groupId, "Medicine");
    await open(page, `/lists?list=${medicine.id}`);
    const screen = lists(page, "en");
    await expect(page.getByText(screen.t.lists.noItems)).toBeVisible();

    await createItem(page, medicine.id, { name: "Aspirin" });
    await screen.refresh.click();

    await expect(screen.item("Aspirin")).toBeVisible();
    await expect(page).toHaveURL(`/lists?list=${medicine.id}`);
  });

  test("T-10 a member on desktop opens an item", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await createItem(page, first!.id, { name: "Milk" });
    await createItem(page, first!.id, { name: "Bread" });
    await open(page, "/lists");
    const screen = lists(page, "en");
    await expect(page.getByText(screen.t.lists.chooseItem)).toBeVisible();

    await screen.item("Milk").click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Milk" }),
    ).toBeVisible();
    await expect(screen.item("Bread")).toBeVisible();
    await expect(screen.item("Milk")).toHaveAttribute("aria-current", "page");
    const list = await screen.item("Bread").boundingBox();
    const item = await page
      .getByRole("heading", { level: 1, name: "Milk" })
      .boundingBox();
    expect(list!.x).toBeLessThan(item!.x);
  });
});

test.describe("languages and accessibility", () => {
  test("AC-99 Lists in English", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await createItem(page, first!.id, { name: "Milk" });
    await open(page, "/lists");
    const screen = lists(page, "en");
    const { t } = screen;

    await expect(page).toHaveTitle(t.lists.title);
    await expect(screen.listMenu).toContainText(t.lists.listMenu);
    await expect(screen.quickField).toBeVisible();
    await expect(page.getByRole("button", { name: t.lists.add })).toBeVisible();
    await expect(
      page.getByRole("group", { name: t.lists.byPerson }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: t.lists.byStatus }),
    ).toBeVisible();
    await expect(screen.item("Milk")).toContainText(t.status.pending);
    await expect(screen.addItem).toContainText(t.lists.add);
  });

  for (const language of ["es", "en"] as const) {
    test(`T-10 Lists has no accessibility violations (${language})`, async ({
      page,
    }) => {
      const email = await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      await createItem(page, first!.id, { name: "Milk", quantity: 2 });
      const reserved = await createItem(page, first!.id, { name: "Shoes" });
      await setItemStatus(reserved.id, "reserved", email);
      const shippedItem = await createItem(page, first!.id, { name: "Soap" });
      await setItemStatus(shippedItem.id, "shipped", email);
      await open(page, "/lists");
      const screen = lists(page, language);
      const { t } = screen;

      await expect(screen.item("Milk")).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.shippedToggle(1).click();
      await expect(screen.item("Soap")).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.listMenu.click();
      await page.getByRole("menuitem", { name: t.lists.newList }).click();
      await expect(screen.newListDialog).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });

    test(`T-19 Lists in every item status and on desktop has no accessibility violations (${language})`, async ({
      page,
    }) => {
      const email = await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      await createItem(page, first!.id, { name: "Milk" });
      for (const [name, status] of [
        ["Shoes", "reserved"],
        ["Backpack", "purchased"],
        ["Soap", "unavailable"],
      ] as const) {
        const item = await createItem(page, first!.id, { name });
        await setItemStatus(item.id, status, email);
      }
      await open(page, "/lists");
      const screen = lists(page, language);
      const { t } = screen;

      await expect(screen.items).toHaveCount(4);
      await expect(screen.item("Milk")).toContainText(t.status.pending);
      await expect(screen.item("Soap")).toContainText(t.status.unavailable);
      await expectNoAccessibilityViolations(page);

      await page.setViewportSize({ width: 1280, height: 900 });
      await open(page, "/lists");
      await expect(page.getByText(t.lists.chooseItem)).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.item("Backpack").click();
      await expect(
        page.getByRole("heading", { level: 1, name: "Backpack" }),
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });

    test(`T-19 Lists with no items, no lists, a field error, or a failed save has no accessibility violations (${language})`, async ({
      page,
    }) => {
      await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      await open(page, "/lists");
      const screen = lists(page, language);
      const { t } = screen;

      await expect(page.getByText(t.lists.noItems)).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.quickField.press("Enter");
      await expect(page.getByText(t.fieldMessages.nameRequired)).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await page.route("**/api/v1/lists/*/items", (route) => route.abort());
      await screen.quickField.fill("Milk");
      await screen.quickField.press("Enter");
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        t.common.couldNotSave,
      );
      await expectNoAccessibilityViolations(page);
      await page.unroute("**/api/v1/lists/*/items");

      await deleteList(first!.id);
      await open(page, "/lists");
      await expect(page.getByText(t.lists.noLists)).toBeVisible();
      await expectNoAccessibilityViolations(page);

      // New list, saved with no name.
      await page.getByRole("button", { name: t.lists.newList }).click();
      await screen.newListDialog
        .getByRole("button", { name: t.lists.create })
        .click();
      await expect(
        screen.newListDialog.getByText(t.fieldMessages.nameRequired),
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });
  }

  test("T-19 Lists filtered to no matches has no accessibility violations", async ({
    page,
  }) => {
    // Ana, a seed user who uses the app in English; this test only looks.
    await signInAsSeedUser(page, "ana");
    await open(page, `/lists?list=${seedIds.lists.medicine}`);
    const screen = lists(page, "en");
    const { t } = screen;

    await screen.filter("byPerson", "Grandma").click();
    await screen.filter("byStatus", t.status.pending).click();
    await expect(page.getByText(t.lists.noMatches)).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
});

// The New list sheet, the first screen on the dialog's sheet variant
// (DESIGN.md, Collapsible Groups & Sheets; T-24's sheet test in
// docs/08-WORK-TICKETS.md). Both projects emulate phones; the wider checks
// resize the page.
test.describe("New list sheet", () => {
  const desktopWidths = [
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ];

  /** Opens Lists as a new user and opens New list from the list menu. */
  async function openSheet(page: Page, language: Language = "en") {
    await signUpOnboarded(page, { language });
    await open(page, "/lists");
    const screen = lists(page, language);
    await screen.listMenu.click();
    await page.getByRole("menuitem", { name: screen.t.lists.newList }).click();
    await expect(screen.newListDialog).toBeVisible();
    return {
      ...screen,
      close: screen.newListDialog.getByRole("button", {
        name: screen.t.common.close,
      }),
    };
  }

  test("T-24 Close has first focus in the New list sheet at every screen size", async ({
    page,
  }) => {
    const sheet = await openSheet(page);
    await expect(sheet.close).toBeFocused();
    await expect(
      sheet.newListDialog.getByLabel(sheet.t.lists.listName),
    ).not.toBeFocused();

    for (const size of desktopWidths) {
      await page.keyboard.press("Escape");
      await page.setViewportSize(size);
      await sheet.listMenu.click();
      await page.getByRole("menuitem", { name: sheet.t.lists.newList }).click();
      await expect(sheet.close).toBeFocused();
    }
  });

  test("T-24 Close and Escape close the New list sheet", async ({ page }) => {
    const sheet = await openSheet(page);

    await sheet.close.click();
    await expect(sheet.newListDialog).toBeHidden();

    await sheet.listMenu.click();
    await page.getByRole("menuitem", { name: sheet.t.lists.newList }).click();
    await expect(sheet.newListDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet.newListDialog).toBeHidden();
  });

  for (const language of ["es", "en"] as const) {
    test(`T-24 the New list sheet's text comes from the translation files (${language})`, async ({
      page,
    }) => {
      const sheet = await openSheet(page, language);
      const { t } = sheet;

      await expect(
        sheet.newListDialog.getByRole("heading", { name: t.lists.newList }),
      ).toBeVisible();
      await expect(sheet.close).toHaveText(t.common.close);
      await expect(
        sheet.newListDialog.getByLabel(t.lists.listName),
      ).toBeVisible();
      await expect(
        sheet.newListDialog.getByRole("button", { name: t.lists.create }),
      ).toBeVisible();
    });
  }

  test("T-24 the New list sheet keeps its actions at the bottom edge below 768px", async ({
    page,
  }) => {
    const sheet = await openSheet(page);
    const viewport = page.viewportSize()!;
    expect(viewport.width).toBeLessThan(768);

    const box = (await sheet.newListDialog.boundingBox())!;
    const create = (await sheet.newListDialog
      .getByRole("button", { name: sheet.t.lists.create })
      .boundingBox())!;
    // The sheet sits on the bottom edge, and Create is its last row, above
    // the footer's 20px bottom padding.
    expect(Math.abs(box.y + box.height - viewport.height)).toBeLessThanOrEqual(
      1,
    );
    expect(viewport.height - (create.y + create.height)).toBeLessThanOrEqual(
      24,
    );
    expect(Math.abs(box.width - viewport.width)).toBeLessThanOrEqual(1);
  });

  test("T-24 the New list sheet opens as a centered dialog from 768px", async ({
    page,
  }) => {
    await page.setViewportSize(desktopWidths[0]!);
    const sheet = await openSheet(page);

    for (const size of desktopWidths) {
      await page.setViewportSize(size);
      const box = (await sheet.newListDialog.boundingBox())!;
      expect(
        Math.abs(box.x + box.width / 2 - size.width / 2),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(box.y + box.height / 2 - size.height / 2),
      ).toBeLessThanOrEqual(1);
      expect(box.y + box.height).toBeLessThan(size.height);
      expect(box.width).toBeLessThan(size.width);
    }
  });
});
