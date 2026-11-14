import { expect, type Page, test } from "@playwright/test";

import {
  chooseLanguage,
  expectNoAccessibilityViolations,
  type Language,
  messages,
  newEmail,
  readMe,
  signInAs,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// One last step (docs/02-UX-DESIGN.md, section 2.3, screen 2; FR-02, FR-03)
// and where users go before and after it.

test.use({ locale: "en-US" });

function form(page: Page, language: Language) {
  const t = messages[language];
  return {
    language: page.getByRole("combobox", { name: t.common.language }),
    country: page.getByRole("combobox", { name: t.phoneField.country }),
    number: page.getByRole("textbox", { name: t.phoneField.number }),
    terms: page.getByRole("checkbox", { name: t.onboarding.acceptsTerms }),
    submit: page.getByRole("button", { name: t.common.continue }),
  };
}

/** Signs in a new user through the Welcome form, in the language on screen. */
async function signUpOnWelcome(page: Page, language: Language) {
  const t = messages[language];
  await page.getByLabel(t.devSignIn.email).fill(newEmail());
  await page.getByRole("button", { name: t.devSignIn.submit }).click();
  await expect(page).toHaveURL("/onboarding");
}

test("AC-98 language prefilled on One last step", async ({ page }) => {
  await page.goto("/");
  await page
    .getByText(messages.es.common.languageNames.es, { exact: true })
    .click();
  await expect(page.getByText(messages.es.welcome.tagline)).toBeVisible();

  await signUpOnWelcome(page, "es");

  // The language field shows the Welcome choice.
  await expect(
    page.getByRole("heading", { name: messages.es.onboarding.title }),
  ).toBeVisible();
  await expect(form(page, "es").language).toHaveValue("es");

  // Changing it switches the screen right away.
  await form(page, "es").language.selectOption("en");
  await expect(
    page.getByRole("heading", { name: messages.en.onboarding.title }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const fields = form(page, "en");
  await expect(fields.language).toHaveValue("en");
  await fields.country.selectOption("US");
  await fields.number.fill("202 555 0123");
  await fields.terms.check();
  await fields.submit.click();

  await expect(page).toHaveURL("/lists");
  expect(await readMe(page)).toMatchObject({
    language: "en",
    whatsappNumber: "+12025550123",
    onboarded: true,
  });
});

test("AC-02 the user can't continue without the age and terms box", async ({
  page,
}) => {
  await signInAs(page);
  await page.goto("/onboarding");
  const fields = form(page, "en");
  await fields.country.selectOption("US");
  await fields.number.fill("202 555 0123");

  await fields.submit.click();

  await expect(
    page.getByText(messages.en.onboarding.acceptsTermsRequired),
  ).toBeVisible();
  await expect(fields.terms).toHaveAttribute("aria-invalid", "true");
  await expect(fields.terms).toBeFocused();
  await expect(page).toHaveURL("/onboarding");
  expect((await readMe(page)).onboarded).toBe(false);
});

test("AC-03 an invalid WhatsApp number is indicated and not saved", async ({
  page,
}) => {
  await signInAs(page);
  await page.goto("/onboarding");
  const fields = form(page, "en");
  await fields.country.selectOption("US");
  await fields.number.fill("202 55");
  await fields.terms.check();

  await fields.submit.click();

  await expect(page.getByText(messages.en.phoneField.invalid)).toBeVisible();
  await expect(fields.number).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/onboarding");
  expect(await readMe(page)).toMatchObject({
    whatsappNumber: null,
    onboarded: false,
  });
});

test("T-04 a new user is sent to One last step", async ({ page }) => {
  await signInAs(page);

  for (const path of ["/", "/lists", "/profile"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/onboarding");
  }
});

test("T-04 an onboarded user skips onboarding", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });

  for (const path of ["/", "/onboarding"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/lists");
  }
});

test("FR-08 a user who is only a buyer lands on To buy", async ({ page }) => {
  await signInAsSeedUser(page, "juan");

  for (const path of ["/", "/onboarding"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/to-buy");
  }
});

test("T-04 a new user lands on their first list", async ({ page }) => {
  await page.goto("/");
  await signUpOnWelcome(page, "en");
  const fields = form(page, "en");
  await fields.country.selectOption("US");
  await fields.number.fill("2025550123");
  await fields.terms.check();

  await fields.submit.click();

  await expect(page).toHaveURL("/lists");
  await expect(
    page.getByRole("heading", { name: messages.en.lists.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: messages.en.groups.startingListName }),
  ).toBeVisible();
});

test("T-04 a failed save keeps what the user entered", async ({ page }) => {
  await signInAs(page);
  await page.goto("/onboarding");
  await page.route("**/api/v1/me/onboarding", (route) => route.abort());
  const fields = form(page, "en");
  await fields.country.selectOption("US");
  await fields.number.fill("202 555 0123");
  await fields.terms.check();

  await fields.submit.click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: messages.en.common.couldNotSave }),
  ).toBeVisible();
  await expect(fields.number).toHaveValue("(202) 555-0123");
  await expect(fields.terms).toBeChecked();
  await expect(page).toHaveURL("/onboarding");
});

for (const language of ["en", "es"] as const) {
  test(`T-04 One last step has no accessibility violations (${language})`, async ({
    page,
  }) => {
    await chooseLanguage(page, language);
    await signInAs(page);
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: messages[language].onboarding.title }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // Also with every field indicated.
    await form(page, language).submit.click();
    await expect(
      page.getByText(messages[language].onboarding.acceptsTermsRequired),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test(`T-19 One last step after a failed save has no accessibility violations (${language})`, async ({
    page,
  }) => {
    await chooseLanguage(page, language);
    await signInAs(page);
    await page.goto("/onboarding");
    await page.route("**/api/v1/me/onboarding", (route) => route.abort());
    const fields = form(page, language);
    await fields.country.selectOption("US");
    await fields.number.fill("202 555 0123");
    await fields.terms.check();

    await fields.submit.click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: messages[language].common.couldNotSave }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}

test.describe("One last step after choosing English in a Spanish browser", () => {
  test.use({ locale: "es-ES" });

  test("AC-99 One last step in English", async ({ page }) => {
    await chooseLanguage(page, "en");
    await signInAs(page);

    await page.goto("/onboarding");

    const t = messages.en;
    const fields = form(page, "en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { level: 1, name: t.onboarding.title }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: t.phoneField.label }),
    ).toBeVisible();
    for (const text of [t.onboarding.intro, t.onboarding.whatsappHelp]) {
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    await expect(fields.language).toHaveValue("en");
    await expect(fields.terms).toBeVisible();
    await expect(fields.submit).toBeVisible();
    // Country names and numbers in the English format.
    await expect(
      fields.country.getByRole("option", { name: "Spain (+34)" }),
    ).toBeAttached();
    await fields.country.selectOption("US");
    await fields.number.pressSequentially("2025550123");
    await expect(fields.number).toHaveValue("(202) 555-0123");
  });
});
