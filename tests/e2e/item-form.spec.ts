import { expect, type Page, test } from "@playwright/test";

import { seedIds } from "../../scripts/seed-data";
import {
  createItem,
  createList,
  expectNoAccessibilityViolations,
  type Language,
  messages,
  myGroup,
  sameOrigin,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// The item form (docs/02-UX-DESIGN.md, section 2.4; FR-13, FR-16, FR-39):
// fields, checks as the user types and on save, saving, editing, moving, and
// the changed-item handling (BR-20).

function form(page: Page, language: Language) {
  const t = messages[language];
  return {
    t,
    link: page.getByLabel(t.itemForm.link),
    name: page.getByLabel(t.itemForm.name, { exact: true }),
    list: page.getByLabel(t.itemForm.list, { exact: true }),
    quantity: page.getByLabel(t.itemForm.quantity),
    notes: page.getByLabel(t.itemForm.notes, { exact: true }),
    save: page.getByRole("button", { name: t.common.save }),
    alert: page.getByRole("main").getByRole("alert"),
  };
}

/** Opens a screen once its controls can take input (see app-shell.spec.ts). */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

async function itemNames(page: Page, listId: string) {
  const response = await page.request.get(`/api/v1/lists/${listId}/items`);
  expect(response.ok()).toBe(true);
  const { items }: { items: { name: string }[] } = await response.json();
  return items.map(({ name }) => name);
}

test.describe("checks", () => {
  test("AC-40 a member saves with an empty name", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await open(page, "/items/new");
    const fields = form(page, "en");

    await fields.save.click();

    await expect(page).toHaveURL(/\/items\/new/);
    await expect(fields.name).toHaveAttribute("aria-invalid", "true");
    await expect(fields.name).toBeFocused();
    await expect(
      page.getByText(fields.t.fieldMessages.nameRequired),
    ).toBeVisible();
    expect(await itemNames(page, first!.id)).toEqual([]);
  });

  test("T-10 a quantity of 0 and a link that isn't a web address are indicated", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await open(page, "/items/new");
    const fields = form(page, "en");
    const { t } = fields;

    await fields.name.fill("Milk");
    await fields.quantity.fill("0");
    await fields.save.click();
    await expect(fields.quantity).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(t.fieldMessages.quantityInvalid)).toBeVisible();

    await fields.quantity.fill("2");
    await expect(fields.quantity).not.toHaveAttribute("aria-invalid");
    await expect(page.getByText(t.fieldMessages.quantityInvalid)).toBeHidden();

    await fields.link.fill("not a link");
    await fields.save.click();
    await expect(fields.link).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(t.fieldMessages.linkInvalid)).toBeVisible();
    await expect(page).toHaveURL(/\/items\/new/);
    expect(await itemNames(page, first!.id)).toEqual([]);
  });

  test("BR-32 the name stops at its limit with a counter", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/items/new");
    const fields = form(page, "en");
    const { t } = fields;

    await fields.name.pressSequentially("a".repeat(105));

    await expect(fields.name).toHaveValue("a".repeat(100));
    await expect(
      page.getByText(
        t.fieldMessages.characterCount
          .replace("{count}", "100")
          .replace("{max}", "100"),
      ),
    ).toContainText(t.fieldMessages.limitReached);
  });
});

test.describe("adding and editing", () => {
  test("T-10 a member adds an item with every field", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    await open(page, `/items/new?list=${first!.id}`);
    const fields = form(page, "en");
    const { t } = fields;

    await fields.link.fill("https://example.com/shoes");
    await fields.name.fill("Sports shoes");
    await fields.quantity.fill("2");
    await fields.notes.fill("In white, no laces");
    await fields.save.click();

    await expect(page).toHaveURL(`/lists?list=${first!.id}`);
    const card = page.getByRole("link", { name: /Sports shoes/ });
    await expect(card).toContainText(t.item.quantity.replace("{count}", "2"));
    await expect(card).toContainText(t.status.pending);
    await card.click();
    await expect(page.getByText("In white, no laces")).toBeVisible();
    await expect(
      page.getByRole("link", { name: new RegExp(t.item.openInStore) }),
    ).toHaveAttribute("href", "https://example.com/shoes");
  });

  test("BR-13 a buyer opens the add form", async ({ page }) => {
    await signInAsSeedUser(page, "juan");
    await page.goto("/items/new");

    await expect(
      page.getByRole("heading", { name: messages.es.errors.NOT_AVAILABLE }),
    ).toBeVisible();
    await expect(page.getByLabel(messages.es.itemForm.name)).toHaveCount(0);
  });

  test("T-10 the form keeps the text when the connection fails", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/items/new");
    const fields = form(page, "en");
    await page.route("**/api/v1/lists/*/items", (route) => route.abort());

    await fields.link.fill("https://example.com/shoes");
    await fields.name.fill("Sports shoes");
    await fields.quantity.fill("2");
    await fields.notes.fill("In white");
    await fields.save.click();

    await expect(fields.alert).toContainText(fields.t.common.couldNotSave);
    await expect(fields.link).toHaveValue("https://example.com/shoes");
    await expect(fields.name).toHaveValue("Sports shoes");
    await expect(fields.quantity).toHaveValue("2");
    await expect(fields.notes).toHaveValue("In white");
  });

  test("T-10 a member edits an item", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    const item = await createItem(page, first!.id, {
      name: "Milk",
      notes: "Whole",
    });
    await open(page, `/items/${item.id}/edit`);
    const fields = form(page, "en");
    await expect(fields.name).toHaveValue("Milk");
    await expect(fields.notes).toHaveValue("Whole");

    await fields.name.fill("Oat milk");
    await fields.notes.fill("Unsweetened");
    await fields.save.click();

    await expect(page).toHaveURL(`/items/${item.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Oat milk" }),
    ).toBeVisible();
    await expect(page.getByText("Unsweetened")).toBeVisible();
  });

  test("BR-19 the edit address of a purchased item shows its page", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "ana");
    await page.goto(`/items/${seedIds.items.purchasedByJuan}/edit`);
    const { t } = form(page, "en");

    await expect(
      page.getByRole("heading", { level: 1, name: "Backpack" }),
    ).toBeVisible();
    await expect(page.getByLabel(t.itemForm.name, { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: t.item.moreActions }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: t.item.edit })).toHaveCount(0);
  });
});

test.describe("moving and changed items", () => {
  test("AC-39 a member moves an item to another list by editing it", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    const { groupId } = await myGroup(page);
    const birthday = await createList(page, groupId, "Birthday");
    const medicine = await createList(page, groupId, "Medicine");
    const item = await createItem(page, birthday.id, { name: "Candles" });
    await open(page, `/items/${item.id}/edit`);
    const fields = form(page, "en");

    await fields.list.selectOption({ label: "Medicine" });
    await fields.save.click();

    await expect(page).toHaveURL(`/items/${item.id}`);
    await open(page, `/lists?list=${medicine.id}`);
    await expect(page.getByRole("link", { name: /Candles/ })).toBeVisible();
    await open(page, `/lists?list=${birthday.id}`);
    await expect(page.getByText(fields.t.lists.noItems)).toBeVisible();
  });

  test("BR-20 a member saves after someone else edited the item", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    const {
      lists: [first],
    } = await myGroup(page);
    const item = await createItem(page, first!.id, {
      name: "Milk",
      quantity: 1,
    });
    await open(page, `/items/${item.id}/edit`);
    const fields = form(page, "en");

    // Another request renames the item after the form loaded.
    const other = await page.request.patch(`/api/v1/items/${item.id}`, {
      data: { version: item.version, name: "Oat milk" },
      headers: sameOrigin(),
    });
    expect(other.ok()).toBe(true);
    await fields.notes.fill("Lactose free");
    await fields.quantity.fill("2");
    await fields.save.click();

    // What the member typed is kept; the field they didn't touch shows the
    // latest item.
    await expect(fields.alert).toContainText(fields.t.errors.ITEM_CHANGED);
    await expect(fields.notes).toHaveValue("Lactose free");
    await expect(fields.quantity).toHaveValue("2");
    await expect(fields.name).toHaveValue("Oat milk");

    // Saving again applies their changes over the latest item, keeping the
    // other edit.
    await fields.save.click();
    await expect(page).toHaveURL(`/items/${item.id}`);
    const article = page.getByRole("article");
    await expect(
      article.getByRole("heading", { level: 1, name: "Oat milk" }),
    ).toBeVisible();
    await expect(article.getByText("Lactose free")).toBeVisible();
    await expect(
      article.getByText(fields.t.item.quantity.replace("{count}", "2")),
    ).toBeVisible();
  });
});

test.describe("languages and accessibility", () => {
  test("AC-99 the item form in English", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/items/new");
    const fields = form(page, "en");
    const { t } = fields;

    await expect(page).toHaveTitle(t.itemForm.addTitle);
    await expect(
      page.getByRole("heading", { level: 1, name: t.itemForm.addTitle }),
    ).toBeVisible();
    for (const field of [
      fields.link,
      fields.name,
      fields.list,
      fields.quantity,
      fields.notes,
    ]) {
      await expect(field).toBeVisible();
    }
    await expect(page.getByText(t.itemForm.notesHelp)).toBeVisible();
    await expect(fields.save).toBeVisible();
  });

  for (const language of ["es", "en"] as const) {
    test(`T-10 the item form has no accessibility violations (${language})`, async ({
      page,
    }) => {
      await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      const item = await createItem(page, first!.id, {
        name: "Milk",
        notes: "Whole",
      });
      await open(page, "/items/new");
      const fields = form(page, language);

      await expect(fields.name).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await fields.quantity.fill("0");
      await fields.save.click();
      await expect(fields.name).toHaveAttribute("aria-invalid", "true");
      await expectNoAccessibilityViolations(page);

      await open(page, `/items/${item.id}/edit`);
      await expect(fields.name).toHaveValue("Milk");
      await expectNoAccessibilityViolations(page);
    });

    test(`T-19 the item form's save errors have no accessibility violations (${language})`, async ({
      page,
    }) => {
      await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      const item = await createItem(page, first!.id, { name: "Milk" });
      const fields = form(page, language);

      // Another request renames the item after the form loaded.
      await open(page, `/items/${item.id}/edit`);
      const other = await page.request.patch(`/api/v1/items/${item.id}`, {
        data: { version: item.version, name: "Oat milk" },
        headers: sameOrigin(),
      });
      expect(other.ok()).toBe(true);
      await fields.notes.fill("Lactose free");
      await fields.save.click();
      await expect(fields.alert).toContainText(fields.t.errors.ITEM_CHANGED);
      await expectNoAccessibilityViolations(page);

      await page.route("**/api/v1/items/*", (route) => route.abort());
      await fields.save.click();
      await expect(fields.alert).toContainText(fields.t.common.couldNotSave);
      await expectNoAccessibilityViolations(page);
    });
  }
});
