import { expect, type Page, test } from "@playwright/test";

import {
  chooseLanguage,
  expectNoAccessibilityViolations,
  inviteFromNewMember,
  type Language,
  messages,
  newEmail,
  readMe,
  sameOrigin,
  seedInvitationCode,
  signInAs,
  signInAsSeedUser,
  signUpOnboarded,
  waitUntilHydrated,
} from "./support";

// The Invitation screen and flow C (docs/02-UX-DESIGN.md, section 1; FR-06,
// BR-06, BR-08, BR-09). Scenarios that use up an invitation have a new member
// create it in a cookie jar of their own and a new user open it; the ones that
// only look open the seed invitations.

test.use({ locale: "en-US" });

function screen(page: Page, language: Language = "en") {
  const t = messages[language];
  return {
    t,
    accept: page.getByRole("button", { name: t.invitation.accept }),
    decline: page.getByRole("button", { name: t.invitation.decline }),
    noLongerValid: page.getByRole("heading", {
      name: t.invitation.noLongerValid,
    }),
    alreadyInGroup: page.getByRole("heading", {
      name: t.invitation.alreadyInGroup,
    }),
  };
}

/** Signs in a new user through the screen's development sign-in form. */
async function signInOnScreen(page: Page, language: Language) {
  const t = messages[language];
  const email = page.getByLabel(t.devSignIn.email);
  await waitUntilHydrated(email);
  await email.fill(newEmail());
  await page.getByRole("button", { name: t.devSignIn.submit }).click();
}

/** Completes One last step with a valid number and the age and terms box. */
async function completeOneLastStep(page: Page, language: Language) {
  const t = messages[language];
  await expect(
    page.getByRole("heading", { name: t.onboarding.title }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: t.phoneField.number })
    .fill("2025550123");
  await page.getByRole("checkbox", { name: t.onboarding.acceptsTerms }).check();
  await page.getByRole("button", { name: t.common.continue }).click();
}

/** A new user who opened the link, signed in, and completed One last step. */
async function arriveThroughInvitation(
  page: Page,
  path: string,
  language: Language,
) {
  await chooseLanguage(page, language);
  await page.goto(path);
  await signInOnScreen(page, language);
  await expect(page).toHaveURL(/\/onboarding\?invitation=/);
  await completeOneLastStep(page, language);
  await expect(page).toHaveURL(path);
}

/** A new, onboarded user who opens the invitation through the API, as One last step does. */
async function onboardThrough(page: Page, path: string) {
  await signInAs(page);
  const code = path.split("/").pop();
  const response = await page.request.post("/api/v1/me/onboarding", {
    data: {
      language: "en",
      whatsappNumber: "+12025550123",
      acceptsTerms: true,
      invitationCode: code,
    },
    headers: sameOrigin(),
  });
  expect(response.ok()).toBe(true);
  await page.goto(path);
}

test("FR-06 a signed-out person opens a buyer invitation", async ({ page }) => {
  const { t, accept } = screen(page);

  await page.goto(`/invitations/${seedInvitationCode("pending")}`);

  await expect(
    page.getByRole("heading", {
      name: t.invitation.invitesYou.replace("{name}", "Ana"),
    }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText("García Group")).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByText(t.common.membershipTypes.buyer, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText(t.invitation.signInToAccept),
  ).toBeVisible();
  // Google isn't configured in the browser tests, so the screen offers the
  // development sign-in that stands in for Continue with Google.
  await expect(
    page.getByRole("button", { name: t.devSignIn.submit }),
  ).toBeVisible();
  await expect(accept).toHaveCount(0);
});

test("T-08 a new user signs in from an invitation and returns to it", async ({
  page,
  request,
}) => {
  const { path } = await inviteFromNewMember(request, { type: "buyer" });
  const { accept, decline } = screen(page);

  await arriveThroughInvitation(page, path, "en");

  await expect(accept).toBeVisible();
  await expect(decline).toBeVisible();
});

test("T-08 a new user from an invitation goes back to it", async ({
  page,
  request,
}) => {
  const { path } = await inviteFromNewMember(request, { type: "member" });

  await arriveThroughInvitation(page, path, "en");

  expect((await readMe(page)).memberships).toEqual([]);
});

for (const language of ["es", "en"] as const) {
  test(`AC-100 a new user accepts a member invitation and lands on Lists (${language})`, async ({
    page,
    request,
  }) => {
    const { path, groupId, groupName } = await inviteFromNewMember(request, {
      type: "member",
    });
    const { t, accept } = screen(page, language);
    await arriveThroughInvitation(page, path, language);

    await accept.click();

    await expect(page).toHaveURL(/\/lists/);
    await expect(
      page.getByRole("heading", { name: t.lists.title }),
    ).toBeVisible();
    await expect(page.getByRole("banner").getByText(groupName)).toBeVisible();
    const me = await readMe(page);
    expect(me.memberships).toEqual([
      expect.objectContaining({ groupId, type: "member", isOwner: false }),
    ]);
  });
}

test("AC-10 a new user accepts a buyer invitation and lands on To buy", async ({
  page,
  request,
}) => {
  const { path, groupId } = await inviteFromNewMember(request, {
    type: "buyer",
  });
  const { t, accept } = screen(page);
  await arriveThroughInvitation(page, path, "en");

  await accept.click();

  await expect(page).toHaveURL(/\/to-buy/);
  const nav = page.getByRole("navigation", { name: t.shell.navigation });
  await expect(nav.getByRole("link")).toHaveText([
    t.tabs.toBuy,
    t.tabs.purchases,
  ]);
  const me = await readMe(page);
  expect(me.memberships).toEqual([
    expect.objectContaining({ groupId, type: "buyer" }),
  ]);
});

test("BR-06 a new user declines and lands on their own group", async ({
  page,
  request,
}) => {
  const { path, groupId } = await inviteFromNewMember(request, {
    type: "member",
  });
  const { t, decline, noLongerValid } = screen(page);
  await arriveThroughInvitation(page, path, "en");

  await decline.click();

  await expect(page).toHaveURL(/\/lists/);
  await expect(
    page.getByRole("heading", { name: t.groups.startingListName }),
  ).toBeVisible();
  const me = await readMe(page);
  expect(me.memberships).toHaveLength(1);
  expect(me.memberships[0]).toMatchObject({ isOwner: true });
  expect(me.memberships[0].groupId).not.toBe(groupId);

  await page.goto(path);
  await expect(noLongerValid).toBeVisible();
});

test("T-08 a failed accept keeps the invitation on screen", async ({
  page,
  request,
}) => {
  const { path } = await inviteFromNewMember(request, { type: "buyer" });
  const { t, accept } = screen(page);
  await onboardThrough(page, path);
  await page.route("**/accept", (route) => route.abort());

  await accept.click();

  await expect(
    page.getByRole("alert").filter({ hasText: t.common.couldNotSave }),
  ).toBeVisible();
  await expect(page).toHaveURL(path);
  await expect(accept).toBeEnabled();

  await page.unroute("**/accept");
  await accept.click();
  await expect(page).toHaveURL(/\/to-buy/);
});

test("AC-11 an expired link on the screen", async ({ page }) => {
  const { accept, noLongerValid } = screen(page);

  await page.goto(`/invitations/${seedInvitationCode("expired")}`);

  await expect(noLongerValid).toBeVisible();
  await expect(accept).toHaveCount(0);
});

test("AC-12 an accepted link on the screen", async ({ page }) => {
  await signUpOnboarded(page, { language: "en" });
  const { accept, noLongerValid } = screen(page);

  await page.goto(`/invitations/${seedInvitationCode("accepted")}`);

  await expect(noLongerValid).toBeVisible();
  await expect(accept).toHaveCount(0);
});

test("AC-13 a cancelled link on the screen", async ({ page }) => {
  const { accept, noLongerValid } = screen(page);

  await page.goto(`/invitations/${seedInvitationCode("cancelled")}`);

  await expect(noLongerValid).toBeVisible();
  await expect(accept).toHaveCount(0);
});

test("AC-15 a member opens an invitation to their own group", async ({
  page,
  request,
}) => {
  await signInAsSeedUser(page, "ana");
  const { accept, decline, alreadyInGroup } = screen(page);
  const code = seedInvitationCode("pending");

  await page.goto(`/invitations/${code}`);

  await expect(alreadyInGroup).toBeVisible();
  await expect(accept).toHaveCount(0);
  await expect(decline).toHaveCount(0);
  // Still valid for the person it was meant for.
  const preview = await request.get(`/api/v1/invitations/by-code/${code}`);
  expect(preview.status()).toBe(200);
});

for (const language of ["es", "en"] as const) {
  test(`T-08 the Invitation screen has no accessibility violations (${language})`, async ({
    page,
    request,
  }) => {
    const { t, accept, alreadyInGroup, noLongerValid } = screen(page, language);
    await chooseLanguage(page, language);

    // Signed out.
    await page.goto(`/invitations/${seedInvitationCode("pending")}`);
    await expect(
      page.getByRole("main").getByText(t.invitation.signInToAccept),
    ).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // No longer valid.
    await page.goto(`/invitations/${seedInvitationCode("cancelled")}`);
    await expect(noLongerValid).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // Ready to accept.
    const { path } = await inviteFromNewMember(request, { type: "member" });
    await signUpOnboarded(page, { language });
    await page.goto(path);
    await expect(accept).toBeVisible();
    await expectNoAccessibilityViolations(page);

    // Already in the group: the user's own group's invitation.
    const own = await page.request.post(
      `/api/v1/groups/${(await readMe(page)).memberships[0].groupId}/invitations`,
      { data: { type: "buyer" }, headers: sameOrigin() },
    );
    await page.goto(new URL((await own.json()).link).pathname);
    await expect(alreadyInGroup).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });
}
