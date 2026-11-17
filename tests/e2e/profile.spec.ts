import { expect, type Page, test } from "@playwright/test";

import { getCountries, getCountryCallingCode } from "libphonenumber-js";

import {
  collectHydrationErrors,
  expectNoAccessibilityViolations,
  type Language,
  messages,
  readMe,
  signUpOnboarded,
  waitUntilHydrated,
} from "./support";

// Profile (docs/02-UX-DESIGN.md, section 2.3, screen 12; FR-04). Each test
// signs up its own user, so the seed users stay as they are.

/**
 * Opens Profile once its form can take input. Screens in the shell stream in
 * after it, so the form can show before the browser has made it interactive.
 */
async function openProfile(page: Page) {
  await page.goto("/profile", { waitUntil: "networkidle" });
}

function profile(page: Page, language: Language) {
  const t = messages[language];
  return {
    heading: page.getByRole("heading", { level: 1, name: t.profile.title }),
    country: page.getByRole("combobox", { name: t.phoneField.country }),
    number: page.getByRole("textbox", { name: t.phoneField.number }),
    save: page.getByRole("button", { name: t.common.save }),
    emails: page.getByRole("switch", { name: t.profile.emails }),
    signOut: page.getByRole("button", { name: t.profile.signOut }),
    languageOption: (option: Language) =>
      page.getByText(t.common.languageNames[option], { exact: true }),
  };
}

test("AC-04 Profile doesn't let the user remove their WhatsApp number", async ({
  page,
}) => {
  await signUpOnboarded(page, { language: "en" });
  await openProfile(page);
  const screen = profile(page, "en");

  await screen.number.fill("");
  await screen.save.click();

  await expect(page.getByText(messages.en.phoneField.required)).toBeVisible();
  await expect(screen.number).toHaveAttribute("aria-invalid", "true");
  await page.reload();
  await expect(screen.number).toHaveValue("(202) 555-0123");
  expect((await readMe(page)).whatsappNumber).toBe("+12025550123");
});

test("T-36 Profile loads without a hydration error in Spanish and English", async ({
  page,
}) => {
  const hydrationErrors = collectHydrationErrors(page);
  // Hong Kong's name differs between Node, which renders the server's HTML,
  // and the browsers, so its selected option is where a mismatch would show.
  const cases = [
    { language: "es", whatsappNumber: "+12025550123", country: "US" },
    { language: "en", whatsappNumber: "+12025550123", country: "US" },
    { language: "es", whatsappNumber: "+85221234567", country: "HK" },
  ] as const;

  for (const { language, whatsappNumber, country } of cases) {
    await signUpOnboarded(page, { language, whatsappNumber });

    await openProfile(page);

    const selector = profile(page, language).country;
    await waitUntilHydrated(selector);
    // The full list is built only once hydration has finished, so React has
    // reported any hydration error by then.
    await expect(selector.locator("option")).toHaveCount(
      getCountries().length + 1,
    );
    await expect(selector).toHaveValue(country);
    const browserName = await page.evaluate(
      ([language, country]) =>
        new Intl.DisplayNames([language], { type: "region" }).of(country),
      [language, country] as const,
    );
    await expect(selector.locator("option:checked")).toHaveText(
      `${browserName} (+${getCountryCallingCode(country)})`,
    );
    if (country === "HK") {
      const nodeName = new Intl.DisplayNames([language], {
        type: "region",
      }).of(country);
      expect(
        browserName,
        "the names differ, so the case is meaningful",
      ).not.toBe(nodeName);
    }
    expect(hydrationErrors, `${language} ${country}`).toEqual([]);
  }
});

test("T-36 a country chosen in Profile is saved and stays selected", async ({
  page,
}) => {
  const cases = [
    {
      language: "es",
      country: "MX",
      typed: "5512345678",
      saved: "+525512345678",
    },
    {
      language: "en",
      country: "GB",
      typed: "7400123456",
      saved: "+447400123456",
    },
  ] as const;

  for (const { language, country, typed, saved } of cases) {
    await signUpOnboarded(page, { language, whatsappNumber: "+12025550123" });
    await openProfile(page);

    const screen = profile(page, language);
    await waitUntilHydrated(screen.country);
    await expect(screen.country.locator("option")).toHaveCount(
      getCountries().length + 1,
    );
    await expect(screen.country).toHaveValue("US");
    await screen.country.selectOption(country);
    await screen.number.fill("");
    await screen.number.pressSequentially(typed);
    await screen.save.click();

    await expect(page.getByRole("status")).toContainText(
      messages[language].common.saved,
    );
    expect((await readMe(page)).whatsappNumber, language).toBe(saved);
    await page.reload({ waitUntil: "networkidle" });
    await expect(screen.country).toHaveValue(country);
  }
});

test("AC-99 Profile in English", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });

  await openProfile(page);

  const screen = profile(page, "en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(screen.heading).toBeVisible();
  for (const text of [
    messages.en.profile.contact,
    messages.en.profile.preferences,
    messages.en.profile.account,
    messages.en.profile.whatsappHelp,
    messages.en.profile.emailsHelp,
  ]) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  await expect(screen.emails).toBeChecked();
  await expect(screen.signOut).toBeVisible();
});

test("FR-04 changing the language in Profile switches the screen", async ({
  page,
}) => {
  await signUpOnboarded(page, { language: "es" });
  await openProfile(page);
  await expect(profile(page, "es").heading).toBeVisible();

  await profile(page, "es").languageOption("en").click();

  await expect(profile(page, "en").heading).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect((await readMe(page)).language).toBe("en");
});

test("FR-04 turning the daily email off is saved", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  await openProfile(page);
  const screen = profile(page, "en");

  await screen.emails.click();

  await expect(screen.emails).not.toBeChecked();
  await expect.poll(async () => (await readMe(page)).receiveEmails).toBe(false);
});

test("FR-04 changing the WhatsApp number is saved", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  await openProfile(page);
  const screen = profile(page, "en");

  await screen.number.fill("202 555 0144");
  await screen.save.click();

  await expect(page.getByRole("status")).toContainText(
    messages.en.common.saved,
  );
  expect((await readMe(page)).whatsappNumber).toBe("+12025550144");
});

test("BR-03 signing out from Profile", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  await openProfile(page);

  await profile(page, "en").signOut.click();

  await expect(page).toHaveURL("/");
  await openProfile(page);
  await expect(page).toHaveURL("/");
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});

test("T-04 a failed save keeps what the user typed", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  await openProfile(page);
  await page.route("**/api/v1/me", (route) =>
    route.request().method() === "PATCH" ? route.abort() : route.continue(),
  );
  const screen = profile(page, "en");

  await screen.number.fill("202 555 0199");
  await screen.save.click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: messages.en.common.couldNotSave }),
  ).toBeVisible();
  await expect(screen.number).toHaveValue("(202) 555-0199");
  expect((await readMe(page)).whatsappNumber).toBe("+12025550123");
});

for (const language of ["en", "es"] as const) {
  test(`T-04 Profile has no accessibility violations (${language})`, async ({
    page,
  }) => {
    await signUpOnboarded(page, { language });
    await openProfile(page);
    await expect(profile(page, language).heading).toBeVisible();

    await expectNoAccessibilityViolations(page);
  });

  test(`T-19 Profile's field error, saved, and failed save states have no accessibility violations (${language})`, async ({
    page,
  }) => {
    await signUpOnboarded(page, { language });
    await openProfile(page);
    const screen = profile(page, language);
    const t = messages[language];

    await screen.number.fill("");
    await screen.save.click();
    await expect(page.getByText(t.phoneField.required)).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await screen.number.fill("202 555 0144");
    await screen.save.click();
    await expect(page.getByRole("status")).toContainText(t.common.saved);
    await expectNoAccessibilityViolations(page);

    await page.route("**/api/v1/me", (route) =>
      route.request().method() === "PATCH" ? route.abort() : route.continue(),
    );
    await screen.number.fill("202 555 0199");
    await screen.save.click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.common.couldNotSave }),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}
