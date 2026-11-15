import { expect, type Page, test } from "@playwright/test";

import {
  chooseLanguage,
  createInvitation,
  expectNoAccessibilityViolations,
  type Language,
  messages,
  readMe,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// The Group screen (docs/02-UX-DESIGN.md, sections 2.4 and 2.7; FR-06, FR-07):
// the group's people, inviting with a link, the pending invitations, and the
// success toast. The scenario on the seed group signs in as Ana and only
// looks; the others sign up their own member, whose group has no buyers.

test.use({ locale: "en-US" });

function group(page: Page, language: Language = "en") {
  const t = messages[language];
  return {
    t,
    inviteMember: page.getByRole("button", { name: t.group.inviteMember }),
    inviteBuyer: page
      .getByRole("button", { name: t.group.inviteBuyer })
      .first(),
    sheet: page.getByRole("dialog"),
    inviteeName: page.getByLabel(t.group.inviteeName),
    createLink: page.getByRole("button", { name: t.group.createLink }),
    link: page.getByRole("textbox", { name: t.group.invitationLink }),
    share: page.getByRole("link", { name: t.group.shareOnWhatsApp }),
    copy: page.getByRole("button", { name: t.group.copyLink }),
    pendingHeading: (count: number) =>
      page.getByRole("heading", {
        name: t.group.pendingInvitations.replace("{count}", String(count)),
      }),
    cancel: page.getByRole("button", { name: t.group.cancelInvitation }),
    toasts: page.getByRole("region", {
      name: /^(Notifications|Notificaciones)/,
    }),
  };
}

/** The WhatsApp message in Share on WhatsApp's address. */
async function sharedMessage(page: Page, language: Language = "en") {
  const href = await group(page, language).share.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  return decodeURIComponent(new URL(href!).searchParams.get("text")!);
}

/** The signed-in member's name as Group shows it, and their group's name. */
async function memberAndGroup(page: Page) {
  const { groupId, groupName } = (await readMe(page)).memberships[0];
  const details = await (
    await page.request.get(`/api/v1/groups/${groupId}`)
  ).json();
  return { name: details.members[0].name as string, groupName };
}

test("FR-07 a member sees the group's members and buyers", async ({ page }) => {
  await signInAsSeedUser(page, "ana");
  const { t } = group(page);

  await page.goto("/group");

  await expect(
    page.getByRole("heading", { level: 1, name: "García Group" }),
  ).toBeVisible();
  // Text queries look inside the main region: while a screen streams in,
  // Next.js briefly keeps a hidden copy of it elsewhere in the page.
  const main = page.getByRole("main");
  await expect(
    main.getByText(t.group.managedBy.replace("{name}", "Ana")),
  ).toBeVisible();
  const members = page
    .getByRole("listitem")
    .filter({ hasText: /@example\.com/ });
  await expect(members).toHaveCount(2);
  await expect(members.filter({ hasText: "Ana" })).toContainText(
    "ana@example.com",
  );
  await expect(members.filter({ hasText: "Ana" })).toContainText(t.group.owner);
  await expect(members.filter({ hasText: "Rosa" })).toContainText(
    "rosa@example.com",
  );
  await expect(members.filter({ hasText: "Rosa" })).not.toContainText(
    t.group.owner,
  );
  await expect(main.getByText("+1 202 555 0103")).toBeVisible();
  await expect(main.getByText("+1 202 555 0104")).toBeVisible();
  await expect(page.getByText("Pedro")).toHaveCount(0);
});

test("T-08 a group with no buyers invites one", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  const { t } = group(page);

  await page.goto("/group");

  await expect(
    page.getByRole("main").getByText(t.group.noBuyers),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: t.group.inviteBuyer }),
  ).toHaveCount(2);
});

test("FR-06 a member creates a buyer invitation and shares it on WhatsApp", async ({
  page,
}) => {
  await signUpOnboarded(page, { language: "en" });
  const screen = group(page);
  await page.goto("/group");
  const { name, groupName } = await memberAndGroup(page);

  await screen.inviteBuyer.click();
  await screen.inviteeName.fill("Carlos");
  await screen.createLink.click();

  await expect(screen.link).toHaveValue(/\/invitations\/[A-Za-z0-9_-]{43}$/);
  const link = await screen.link.inputValue();
  await expect(screen.copy).toBeVisible();
  await expect(screen.sheet.getByText("Expires in 7 days")).toBeVisible();
  expect(await sharedMessage(page)).toBe(
    `Hi Carlos, ${name} invited you to ${groupName} on ComproParaTi as a buyer: ${link}`,
  );
});

test("FR-06 an invitation without a name starts its message without one", async ({
  page,
}) => {
  await signUpOnboarded(page, { language: "es" });
  const screen = group(page, "es");
  await page.goto("/group");
  const { name, groupName } = await memberAndGroup(page);

  await screen.inviteMember.click();
  await screen.createLink.click();

  await expect(screen.link).toHaveValue(/\/invitations\//);
  const link = await screen.link.inputValue();
  expect(await sharedMessage(page, "es")).toBe(
    `Hola, ${name} te invitó a ${groupName} en ComproParaTi como miembro: ${link}`,
  );
});

test("FR-06 a member copies the link", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit doesn't let tests read the clipboard.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signUpOnboarded(page, { language: "en" });
  const screen = group(page);
  await page.goto("/group");
  await screen.inviteBuyer.click();
  await screen.createLink.click();
  const link = await screen.link.inputValue();

  await screen.copy.click();

  await expect(
    page.getByRole("button", { name: screen.t.group.linkCopied }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
});

test("BR-32 the invitee name stops at its limit", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  const screen = group(page);
  await page.goto("/group");
  await screen.inviteBuyer.click();

  await screen.inviteeName.click();
  await page.keyboard.insertText("a".repeat(101));

  await expect(screen.inviteeName).toHaveValue("a".repeat(100));
  await expect(
    screen.sheet.getByText(
      screen.t.fieldMessages.characterCount
        .replace("{count}", "100")
        .replace("{max}", "100"),
    ),
  ).toBeVisible();
});

test("T-08 a failed invitation keeps what the member typed", async ({
  page,
}) => {
  await signUpOnboarded(page, { language: "en" });
  const screen = group(page);
  await page.goto("/group");
  await screen.inviteBuyer.click();
  await screen.inviteeName.fill("Carlos");
  await page.route("**/api/v1/groups/*/invitations", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );

  await screen.createLink.click();

  await expect(
    screen.sheet.getByRole("alert").filter({
      hasText: screen.t.common.couldNotSave,
    }),
  ).toBeVisible();
  await expect(screen.inviteeName).toHaveValue("Carlos");
});

for (const language of ["es", "en"] as const) {
  test(`AC-101 the pending invitation for Carlos (${language})`, async ({
    page,
  }) => {
    await signUpOnboarded(page, { language });
    await createInvitation(page.request, {
      type: "buyer",
      inviteeName: "Carlos",
    });
    const screen = group(page, language);

    await page.goto("/group");

    await expect(screen.pendingHeading(1)).toBeVisible();
    const row = page.getByRole("listitem").filter({ hasText: "Carlos" });
    await expect(row).toContainText(
      language === "en" ? "Invited as buyer" : "Invitado como comprador",
    );
    await expect(row).toContainText(
      language === "en" ? "Expires in 7 days" : "Expira en 7 días",
    );
  });
}

test("FR-06 a member cancels an invitation", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  const { path } = await createInvitation(page.request, { type: "buyer" });
  const screen = group(page);
  await page.goto("/group");
  await expect(screen.pendingHeading(1)).toBeVisible();

  await screen.cancel.click();

  await expect(
    screen.toasts.getByText(screen.t.group.invitationCancelled),
  ).toBeVisible();
  await expect(screen.cancel).toHaveCount(0);
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: screen.t.invitation.noLongerValid }),
  ).toBeVisible();
});

test("T-08 the toast closes by itself or with Close", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  await createInvitation(page.request, { type: "buyer" });
  await createInvitation(page.request, { type: "member" });
  const screen = group(page);
  await page.goto("/group");
  const toast = screen.toasts.getByText(screen.t.group.invitationCancelled);

  await screen.cancel.first().click();
  await expect(toast).toBeVisible();
  // Announced politely while it shows.
  await expect(
    page
      .locator('[aria-live="polite"]')
      .filter({ hasText: screen.t.group.invitationCancelled }),
  ).not.toHaveCount(0);
  await expect(toast).toBeHidden({ timeout: 8_000 });

  await screen.cancel.first().click();
  await expect(toast).toBeVisible();
  await screen.toasts
    .getByRole("button", { name: screen.t.common.close })
    .click();
  await expect(toast).toBeHidden();
});

for (const language of ["es", "en"] as const) {
  test(`T-08 Group has no accessibility violations (${language})`, async ({
    page,
  }) => {
    await chooseLanguage(page, language);
    await signUpOnboarded(page, { language });
    await createInvitation(page.request, { type: "member" });
    const screen = group(page, language);
    await page.goto("/group");
    await expect(screen.pendingHeading(1)).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await screen.inviteBuyer.click();
    await expect(screen.createLink).toBeVisible();
    await expectNoAccessibilityViolations(page);

    await screen.createLink.click();
    await expect(screen.link).toBeVisible();
    await expectNoAccessibilityViolations(page);
    await page.keyboard.press("Escape");
    await expect(screen.sheet).toHaveCount(0);

    await screen.cancel.first().click();
    await expect(
      screen.toasts.getByText(screen.t.group.invitationCancelled),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}
