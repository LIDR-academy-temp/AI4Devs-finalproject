import { expect, type Page, test } from "@playwright/test";

import { seedIds } from "../../scripts/seed-data";
import {
  addMember,
  createItem,
  expectNoAccessibilityViolations,
  expectNoAccessibilityViolationsAfterRefresh,
  type Language,
  messages,
  myGroup,
  sameOrigin,
  setItemStatus,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// The item page for members (docs/02-UX-DESIGN.md, sections 2.4 and 2.5;
// FR-07, FR-23, BR-19): status, details, notes as plain text, Open in store,
// the actions for each status, and the "not available" state (BR-13).

function itemPage(page: Page, language: Language) {
  const t = messages[language];
  return {
    t,
    heading: (name: string) => page.getByRole("heading", { level: 1, name }),
    /** The item itself; on desktop the list beside it repeats some text. */
    item: page.getByRole("article"),
    reserve: page.getByRole("button", { name: t.item.reserve }),
    moreActions: page.getByRole("button", { name: t.item.moreActions }),
    menuItem: (name: string) => page.getByRole("menuitem", { name }),
    editButton: page.getByRole("link", { name: t.item.edit, exact: true }),
    deleteDialog: page.getByRole("dialog"),
    notAvailable: page.getByRole("heading", { name: t.errors.NOT_AVAILABLE }),
  };
}

/** Opens a screen once its controls can take input (see app-shell.spec.ts). */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

/** A new member's item in their first list. */
async function newItem(
  page: Page,
  language: Language,
  body: Parameters<typeof createItem>[2],
) {
  const email = await signUpOnboarded(page, { language });
  const {
    groupId,
    lists: [first],
  } = await myGroup(page);
  const item = await createItem(page, first!.id, body);
  return { email, groupId, listId: first!.id, item };
}

test.describe("actions", () => {
  test("AC-23 a member opens a pending item", async ({ page }) => {
    const { item } = await newItem(page, "en", { name: "Milk" });
    await open(page, `/items/${item.id}`);
    const screen = itemPage(page, "en");

    await expect(screen.heading("Milk")).toBeVisible();
    await expect(screen.reserve).toBeVisible();
    await screen.moreActions.click();
    await expect(screen.menuItem(screen.t.item.edit)).toBeVisible();
    await expect(screen.menuItem(screen.t.item.delete)).toBeVisible();
  });

  test("BR-19 actions on reserved, purchased, and unavailable items", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "ana");
    const screen = itemPage(page, "en");
    const { t } = screen;

    await open(page, `/items/${seedIds.items.reservedByJuan}`);
    await expect(screen.heading("Running shoes")).toBeVisible();
    await expect(screen.reserve).toHaveCount(0);
    await screen.moreActions.click();
    await expect(screen.menuItem(t.item.edit)).toBeVisible();
    await expect(screen.menuItem(t.item.delete)).toHaveCount(0);
    await page.keyboard.press("Escape");

    await open(page, `/items/${seedIds.items.purchasedByJuan}`);
    await expect(screen.heading("Backpack")).toBeVisible();
    await expect(screen.reserve).toHaveCount(0);
    await expect(screen.moreActions).toHaveCount(0);
    await expect(screen.editButton).toHaveCount(0);

    await open(page, `/items/${seedIds.items.unavailable}`);
    await expect(screen.heading("Ibuprofen")).toBeVisible();
    await expect(screen.editButton).toBeVisible();
    await expect(screen.reserve).toHaveCount(0);
    await screen.moreActions.click();
    await expect(screen.menuItem(t.item.delete)).toBeVisible();
    await expect(screen.menuItem(t.item.edit)).toHaveCount(0);
  });
});

test.describe("details", () => {
  test("AC-95 notes with HTML or script tags are shown as text", async ({
    page,
  }) => {
    const notes =
      '<b>bold</b><script>window.__notesRan = true</script><img src="x" onerror="window.__notesRan = true">';
    const { groupId, item } = await newItem(page, "en", {
      name: "Tricky",
      notes,
    });
    // Another member of the group opens it.
    const otherEmail = await signUpOnboarded(page, { language: "en" });
    await addMember(otherEmail, groupId);
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("dialog", (dialog) => {
      problems.push(`dialog: ${dialog.message()}`);
      void dialog.dismiss();
    });

    await open(page, `/items/${item.id}`);

    const shown = itemPage(page, "en").item.getByText(notes, { exact: true });
    await expect(shown).toBeVisible();
    // The notes hold only their text: none of it became an element.
    await expect(shown.locator("*")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as { __notesRan?: boolean }).__notesRan,
      ),
    ).toBeUndefined();
    expect(problems).toEqual([]);
  });

  test("T-10 a reserved item names its buyer", async ({ page }) => {
    await signInAsSeedUser(page, "ana");
    await open(page, `/items/${seedIds.items.reservedByJuan}`);
    const { t, item } = itemPage(page, "en");

    await expect(
      item.getByText(t.item.reservedBy.replace("{name}", "Juan")),
    ).toBeVisible();
    await expect(
      item.getByText(t.item.for.replace("{name}", "Anthony")),
    ).toBeVisible();
    await expect(
      item.getByText(t.item.quantity.replace("{count}", "1")),
    ).toBeVisible();
    await expect(item.getByText("Size 4, blue if possible")).toBeVisible();
  });

  test("T-10 Open in store opens the link in a new tab", async ({ page }) => {
    const { listId, item } = await newItem(page, "en", {
      name: "Shoes",
      url: "https://example.com/shoes",
    });
    const plain = await createItem(page, listId, { name: "Milk" });
    const { t } = itemPage(page, "en");
    const store = page.getByRole("link", {
      name: new RegExp(t.item.openInStore),
    });

    await open(page, `/items/${item.id}`);
    await expect(store).toHaveAttribute("href", "https://example.com/shoes");
    await expect(store).toHaveAttribute("target", "_blank");
    await expect(store).toHaveAttribute("rel", /noopener/);

    await open(page, `/items/${plain.id}`);
    await expect(itemPage(page, "en").heading("Milk")).toBeVisible();
    await expect(store).toHaveCount(0);
  });
});

test.describe("deleting", () => {
  test("T-10 a member deletes a pending item", async ({ page }) => {
    const { listId, item } = await newItem(page, "en", { name: "Milk" });
    await open(page, `/items/${item.id}`);
    const screen = itemPage(page, "en");
    const { t } = screen;

    await screen.moreActions.click();
    await screen.menuItem(t.item.delete).click();
    await expect(screen.deleteDialog).toContainText(
      t.item.deleteTitle.replace("{name}", "Milk"),
    );
    await screen.deleteDialog
      .getByRole("button", { name: t.item.delete })
      .click();

    await expect(page).toHaveURL(`/lists?list=${listId}`);
    await expect(page.getByText(t.lists.noItems)).toBeVisible();
  });

  test("BR-20 a member deletes an item that was reserved meanwhile", async ({
    page,
  }) => {
    const { item } = await newItem(page, "en", { name: "Milk" });
    await open(page, `/items/${item.id}`);
    const screen = itemPage(page, "en");
    const { t } = screen;

    await setItemStatus(item.id, "reserved", "juan@example.com");
    await screen.moreActions.click();
    await screen.menuItem(t.item.delete).click();
    await screen.deleteDialog
      .getByRole("button", { name: t.item.delete })
      .click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      t.errors.ITEM_CHANGED,
    );
    await expect(
      screen.item.getByText(t.item.reservedBy.replace("{name}", "Juan")),
    ).toBeVisible();
    await screen.moreActions.click();
    await expect(screen.menuItem(t.item.edit)).toBeVisible();
    await expect(screen.menuItem(t.item.delete)).toHaveCount(0);
  });
});

test.describe("not available", () => {
  test("AC-27 a member opens a deleted item", async ({ page }) => {
    const { item } = await newItem(page, "en", { name: "Milk" });
    const response = await page.request.delete(`/api/v1/items/${item.id}`, {
      headers: sameOrigin(),
    });
    expect(response.status()).toBe(204);

    await page.goto(`/items/${item.id}`);

    const screen = itemPage(page, "en");
    await expect(screen.notAvailable).toBeVisible();
    await expect(
      page.getByRole("link", { name: screen.t.states.goToStart }),
    ).toBeVisible();
  });

  test("AC-25 a buyer opens another group's item", async ({ page }) => {
    await signInAsSeedUser(page, "juan");
    await page.goto(`/items/${seedIds.items.perezPending}`);

    await expect(itemPage(page, "es").notAvailable).toBeVisible();
    await expect(page.getByText("Coffee")).toHaveCount(0);
  });
});

test.describe("languages and accessibility", () => {
  test("AC-99 the item page in English", async ({ page }) => {
    const { item } = await newItem(page, "en", { name: "Milk", quantity: 2 });
    await open(page, `/items/${item.id}`);
    const screen = itemPage(page, "en");
    const { t } = screen;

    await expect(page).toHaveTitle("Milk");
    await expect(screen.item).toContainText(t.status.pending);
    await expect(
      screen.item.getByText(t.item.quantity.replace("{count}", "2")),
    ).toBeVisible();
    await expect(screen.reserve).toBeVisible();
    await expect(screen.moreActions).toBeVisible();
    await expect(page.getByRole("link", { name: t.item.back })).toBeVisible();
  });

  for (const language of ["es", "en"] as const) {
    test(`T-10 the item page has no accessibility violations (${language})`, async ({
      page,
    }) => {
      const { email, listId, item } = await newItem(page, language, {
        name: "Milk",
        notes: "Whole",
        url: "https://example.com/milk",
      });
      const unavailable = await createItem(page, listId, { name: "Soap" });
      await setItemStatus(unavailable.id, "unavailable", email);
      const screen = itemPage(page, language);
      const { t } = screen;

      await open(page, `/items/${item.id}`);
      await expect(screen.heading("Milk")).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.moreActions.click();
      await expect(screen.menuItem(t.item.delete)).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.menuItem(t.item.delete).click();
      await expect(screen.deleteDialog).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await open(page, `/items/${unavailable.id}`);
      await expect(screen.editButton).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });

    test(`T-19 the item page in every other status has no accessibility violations (${language})`, async ({
      page,
    }) => {
      const { email, listId, item } = await newItem(page, language, {
        name: "Milk",
      });
      const screen = itemPage(page, language);
      const { t } = screen;

      for (const status of ["reserved", "purchased", "shipped"] as const) {
        const other = await createItem(page, listId, { name: status });
        await setItemStatus(other.id, status, email);
        await open(page, `/items/${other.id}`);
        await expect(screen.heading(status)).toBeVisible();
        await expect(screen.item).toContainText(t.status[status]);
        await expectNoAccessibilityViolations(page);
      }

      // The item changed after the page loaded, so deleting it fails.
      await open(page, `/items/${item.id}`);
      await setItemStatus(item.id, "reserved", "juan@example.com");
      await screen.moreActions.click();
      await screen.menuItem(t.item.delete).click();
      await screen.deleteDialog
        .getByRole("button", { name: t.item.delete })
        .click();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        t.errors.ITEM_CHANGED,
      );
      // The refusal refreshes the screen to show the latest (BR-20), and the
      // message stays.
      await expect(screen.item).toContainText(t.status.reserved);
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        t.errors.ITEM_CHANGED,
      );
      await expectNoAccessibilityViolationsAfterRefresh(page);

      const deleted = await createItem(page, listId, { name: "Gone" });
      const response = await page.request.delete(
        `/api/v1/items/${deleted.id}`,
        { headers: sameOrigin() },
      );
      expect(response.status()).toBe(204);
      await page.goto(`/items/${deleted.id}`);
      await expect(screen.notAvailable).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });
  }
});
