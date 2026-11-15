import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  addMember,
  addMemberGroup,
  createItem,
  expectNoAccessibilityViolations,
  holdScreen,
  type Language,
  messages,
  myGroup,
  sameOrigin,
  setItemStatus,
  signInAsSeedUser,
  signUpOnboarded,
} from "./support";

// The app shell (docs/02-UX-DESIGN.md, sections 2.2 and 2.7; FR-08, FR-37):
// header, tabs, group selector, Refresh, and the shared states. Scenarios that
// sign in as a seed user only look; the others sign up their own user.

const TAB_KEYS = ["lists", "people", "group", "toBuy", "purchases"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function shell(page: Page, language: Language) {
  const t = messages[language];
  const nav = page.getByRole("navigation", { name: t.shell.navigation });
  return {
    t,
    nav,
    tab: (tab: TabKey) => nav.getByRole("link", { name: t.tabs[tab] }),
    header: page.getByRole("banner"),
    refresh: page.getByRole("button", { name: t.shell.refresh }),
    avatar: page.getByRole("link", { name: t.shell.profile }),
    groupSelector: page.getByRole("button", {
      name: new RegExp(`^${t.shell.chooseGroup}`),
    }),
    heading: (name: string) => page.getByRole("heading", { level: 1, name }),
    notAvailable: page.getByRole("heading", { name: t.errors.NOT_AVAILABLE }),
  };
}

/** The navigation shows exactly these tabs, in this order, by their names. */
async function expectTabs(page: Page, language: Language, tabs: TabKey[]) {
  const links = shell(page, language).nav.getByRole("link");
  await expect(links).toHaveCount(tabs.length);
  for (const [index, tab] of tabs.entries()) {
    await expect(links.nth(index)).toHaveAccessibleName(
      messages[language].tabs[tab],
    );
  }
}

/** How an element draws a focus ring: as an outline or as a box shadow. */
async function ringLook(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
      outlineShown:
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      boxShadow: style.boxShadow,
    };
  });
}

/**
 * Opens a screen once its controls can take input. Screens in the shell stream
 * in after it, so they can show before the browser has made them interactive.
 */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.describe("tabs", () => {
  test("FR-08 a member who doesn't buy sees Lists, People, and Group", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/lists");

    await expectTabs(page, "en", ["lists", "people", "group"]);
    await expect(shell(page, "en").tab("lists")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("AC-24 a user who is only a buyer sees only To buy and My purchases", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "juan");
    await page.goto("/");

    await expect(page).toHaveURL("/to-buy");
    await expectTabs(page, "es", ["toBuy", "purchases"]);
  });

  test("FR-08 a member in one group and buyer in another sees every tab", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "luis");
    await page.goto("/");

    await expect(page).toHaveURL("/lists");
    await expectTabs(page, "es", [...TAB_KEYS]);
  });

  test("FR-08 choosing a tab opens its screen", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = shell(page, "en");

    await screen.tab("people").click();

    await expect(page).toHaveURL("/people");
    await expect(screen.heading(screen.t.tabs.people)).toBeVisible();
    await expect(screen.tab("people")).toHaveAttribute("aria-current", "page");
    await expect(screen.tab("lists")).not.toHaveAttribute("aria-current");
  });
});

test.describe("layout", () => {
  test("T-05 the shell fits a 360 px wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await signUpOnboarded(page, { language: "es" });

    for (const path of ["/lists", "/profile"]) {
      await page.goto(path);
      const screen = shell(page, "es");
      await expect(screen.header).toBeInViewport({ ratio: 1 });
      await expect(screen.nav).toBeInViewport({ ratio: 1 });
      const bar = await screen.nav.boundingBox();
      expect(bar!.height).toBeGreaterThanOrEqual(64);
      expect(bar!.y + bar!.height).toBeCloseTo(740, 0);
      await expectNoSidewaysScroll(page);
      for (const link of await screen.nav.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(48);
        expect(box?.width).toBeGreaterThanOrEqual(48);
      }
    }
  });

  test("T-05 five tabs fit a 360 px wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await signInAsSeedUser(page, "luis");
    await page.goto("/lists");

    await expect(shell(page, "es").nav).toBeInViewport({ ratio: 1 });
    await expectNoSidewaysScroll(page);
  });

  test("T-05 desktop shows the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/lists");
    const screen = shell(page, "en");

    const nav = await screen.nav.boundingBox();
    expect(nav).toMatchObject({ x: 0, y: 0, height: 800 });
    expect(nav!.width).toBeGreaterThanOrEqual(260);
    expect(nav!.width).toBeLessThanOrEqual(280);
    // One navigation element, and it's the sidebar: no bottom bar.
    await expect(page.getByRole("navigation")).toHaveCount(1);
    // The content is centered in the space next to the sidebar: Lists shows
    // the list and the item side by side, up to 1120px wide, and other
    // screens keep a 640px column (DESIGN.md, Responsive Layout Model).
    for (const [path, maxWidth] of [
      ["/lists", 1120],
      ["/people", 640],
    ] as const) {
      await page.goto(path);
      await expect(screen.nav).toBeVisible();
      const content = await page.getByRole("main").boundingBox();
      expect(content!.width).toBeLessThanOrEqual(maxWidth);
      const spaceLeft = content!.x - nav!.width;
      const spaceRight = 1280 - (content!.x + content!.width);
      expect(spaceLeft).toBeGreaterThanOrEqual(0);
      expect(Math.abs(spaceLeft - spaceRight)).toBeLessThanOrEqual(2);
      await expectNoSidewaysScroll(page);
    }
  });
});

// The bottom bar's height (T-34; DESIGN.md, Navigation): tab labels stay at
// 16px, are never cut off, take at most two lines without breaking a word,
// and stay 10px apart; and + Agregar sits 16px above the bar's real height.

type TabCount = 3 | 4 | 5;

/**
 * Signs up a member whose bar shows this many tabs: Lists, People, and Group;
 * My purchases too once they reserve an item; and To buy too as a buyer in
 * another group (docs/02-UX-DESIGN.md, section 2.2).
 */
async function signUpWithTabs(page: Page, language: Language, count: TabCount) {
  let buyerGroupId: string | undefined;
  if (count === 5) {
    await signUpOnboarded(page, { language });
    buyerGroupId = (await myGroup(page)).groupId;
  }
  const email = await signUpOnboarded(page, { language });
  if (buyerGroupId) await addMember(email, buyerGroupId, "buyer");
  if (count === 4) {
    const { lists } = await myGroup(page);
    const item = await createItem(page, lists[0]!.id, { name: "Shoes" });
    await setItemStatus(item.id, "reserved", email);
  }
}

/**
 * Each tab's width and its label's text, size, and lines; whether the label
 * fits its tab uncut and breaks a word; and how far it is from the next tab's
 * label on the lines they share.
 */
async function tabLabels(nav: Locator) {
  return nav.getByRole("link").evaluateAll((links) => {
    const labels = links.map((link) => link.lastElementChild as HTMLElement);
    const lineBoxes = (label: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(label);
      return [...range.getClientRects()];
    };
    return links.map((link, index) => {
      const label = labels[index]!;
      const style = getComputedStyle(label);
      const box = label.getBoundingClientRect();
      const tab = link.getBoundingClientRect();
      // A word is broken when its letters sit on more than one line.
      const text = label.firstChild!;
      let offset = 0;
      let breaksAWord = false;
      for (const word of label.textContent!.split(" ")) {
        const range = document.createRange();
        range.setStart(text, offset);
        range.setEnd(text, offset + word.length);
        const tops = new Set(
          [...range.getClientRects()].map(({ top }) => Math.round(top)),
        );
        if (tops.size > 1) breaksAWord = true;
        offset += word.length + 1;
      }
      const next = labels[index + 1];
      let gapToNext = Infinity;
      if (next) {
        for (const line of lineBoxes(label)) {
          for (const nextLine of lineBoxes(next)) {
            if (Math.abs(line.top - nextLine.top) < 2) {
              gapToNext = Math.min(gapToNext, nextLine.left - line.right);
            }
          }
        }
      }
      return {
        text: label.textContent,
        tabWidth: tab.width,
        fontSize: parseFloat(style.fontSize),
        lines: Math.round(box.height / parseFloat(style.lineHeight)),
        breaksAWord,
        gapToNext,
        insideTab:
          box.left >= tab.left - 0.5 &&
          box.right <= tab.right + 0.5 &&
          box.bottom <= tab.bottom + 0.5,
        cut:
          label.scrollWidth > label.clientWidth ||
          label.scrollHeight > label.clientHeight ||
          link.scrollWidth > link.clientWidth ||
          style.textOverflow === "ellipsis",
      };
    });
  });
}

async function expectLabelsFit(page: Page, language: Language) {
  const screen = shell(page, language);
  const labels = await tabLabels(screen.nav);
  for (const [index, label] of labels.entries()) {
    const name = label.text!;
    // Every label but the last shares a line with the next one, so the gap
    // is measured, not left at Infinity.
    if (index < labels.length - 1) {
      expect(Number.isFinite(label.gapToNext), name).toBe(true);
    }
    // The whole name is there: not shortened or replaced.
    expect(Object.values(screen.t.tabs)).toContain(name);
    expect(label.fontSize, name).toBeGreaterThanOrEqual(16);
    expect(label.insideTab, name).toBe(true);
    expect(label.cut, name).toBe(false);
    expect(label.lines, name).toBeLessThanOrEqual(2);
    expect(label.breaksAWord, name).toBe(false);
    expect(label.tabWidth, name).toBeGreaterThanOrEqual(48);
    expect(Math.round(label.gapToNext * 10) / 10, name).toBeGreaterThanOrEqual(
      10,
    );
  }
}

/** + Agregar is fully on screen and at least 16px above the bottom bar. */
async function expectAddAboveBar(page: Page, language: Language) {
  const screen = shell(page, language);
  const add = page.getByRole("link", { name: screen.t.lists.addItem });
  await expect(add).toBeInViewport({ ratio: 1 });
  // The bar measures itself after a resize, so the button can take a frame
  // to settle.
  await expect(async () => {
    const bar = (await screen.nav.boundingBox())!;
    const button = (await add.boundingBox())!;
    const gap = bar.y - (button.y + button.height);
    expect(Math.round(gap * 10) / 10).toBeGreaterThanOrEqual(16);
  }).toPass({ timeout: 5_000 });
}

test.describe("bottom bar height", () => {
  for (const language of ["es", "en"] as const) {
    for (const count of [3, 4, 5] as const) {
      test(`T-34 with ${count} tabs, labels fit on two lines without breaking a word and + Agregar is visible (${language})`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 740 });
        await signUpWithTabs(page, language, count);
        await open(page, "/lists");
        await expect(shell(page, language).nav.getByRole("link")).toHaveCount(
          count,
        );

        for (const width of [360, 390]) {
          await page.setViewportSize({ width, height: 740 });
          await expectLabelsFit(page, language);
          await expectAddAboveBar(page, language);
          await expectNoSidewaysScroll(page);
        }
      });
    }
  }

  for (const language of ["es", "en"] as const) {
    for (const count of [3, 4, 5] as const) {
      test(`T-34 + Agregar isn't covered before the page's JavaScript runs (${count} tabs, ${language})`, async ({
        page,
      }) => {
        // With JavaScript turned off the screen never streams in, so this
        // blocks the app's scripts instead: the page arrives whole, as on a
        // slow connection before the scripts load, and the bar never measures
        // itself.
        await page.setViewportSize({ width: 360, height: 740 });
        await signUpWithTabs(page, language, count);
        await page.route("**/_next/static/**/*.js", (route) => route.abort());
        await page.goto("/lists", { waitUntil: "load" });
        await expect(shell(page, language).nav.getByRole("link")).toHaveCount(
          count,
        );

        for (const width of [360, 390]) {
          await page.setViewportSize({ width, height: 740 });
          const measured = await page.evaluate(() =>
            document.documentElement.style.getPropertyValue("--tab-bar-height"),
          );
          expect(measured).toBe("");
          await expectAddAboveBar(page, language);
        }
      });
    }
  }
});

test.describe("header", () => {
  test("T-05 the avatar opens Profile", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = shell(page, "en");

    await screen.avatar.click();

    await expect(page).toHaveURL("/profile");
    await expect(screen.heading(messages.en.profile.title)).toBeVisible();
  });

  test("T-05 a buyer with no member group sees the app name", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "juan");
    await page.goto("/");
    const screen = shell(page, "es");

    await expect(screen.header).toContainText(messages.es.common.appName);
    await expect(screen.groupSelector).toHaveCount(0);
  });

  test("T-05 Refresh shows data changed elsewhere", async ({ page }) => {
    await signUpOnboarded(page, { language: "es" });
    await open(page, "/lists");
    await expect(
      shell(page, "es").heading(messages.es.lists.title),
    ).toBeVisible();

    const response = await page.request.patch("/api/v1/me", {
      data: { language: "en" },
      headers: sameOrigin(),
    });
    expect(response.ok()).toBe(true);
    // Holds back the server's answer, so the working state can be seen.
    await page.route("**/lists**", async (route) => {
      const headers = route.request().headers();
      if (headers["rsc"] && !headers["next-router-prefetch"]) {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      await route.continue();
    });
    const refresh = shell(page, "es").refresh;
    await refresh.click();

    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await expect(
      shell(page, "en").heading(messages.en.lists.title),
    ).toBeVisible();
    await expect(shell(page, "en").refresh).not.toHaveAttribute("aria-busy");
    await expect(page).toHaveURL("/lists");
  });
});

test.describe("group selector", () => {
  test("T-05 a member of two groups switches between them", async ({
    page,
  }) => {
    const email = await signUpOnboarded(page, { language: "en" });
    // Sorts after the user's own group, so it isn't current at first.
    await addMemberGroup(email, "Zeta family");
    await open(page, "/lists");
    const screen = shell(page, "en");
    await expect(screen.groupSelector).not.toContainText("Zeta family");
    await expect(
      page.getByText(messages.en.groups.startingListName),
    ).toBeVisible();

    await screen.groupSelector.click();
    await page.getByRole("menuitemradio", { name: "Zeta family" }).click();

    await expect(screen.groupSelector).toContainText("Zeta family");
    await expect(page.getByText(messages.en.lists.noLists)).toBeVisible();
  });

  test("T-05 a member of one group sees its name with no selector", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/lists");
    const screen = shell(page, "en");

    await expect(screen.header).toContainText(
      messages.en.groups.startingGroupName.replace("{firstName}", ""),
    );
    await expect(screen.groupSelector).toHaveCount(0);
  });

  test("FR-08 a buyer group isn't offered in the selector", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "luis");
    await page.goto("/lists");
    const screen = shell(page, "es");

    await expect(screen.header).toContainText("Pérez Group");
    await expect(screen.groupSelector).toHaveCount(0);
  });

  test("T-05 the chosen group is kept after reloading", async ({ page }) => {
    const email = await signUpOnboarded(page, { language: "en" });
    await addMemberGroup(email, "Zeta family");
    await open(page, "/lists");
    const screen = shell(page, "en");
    await screen.groupSelector.click();
    await page.getByRole("menuitemradio", { name: "Zeta family" }).click();
    await expect(screen.groupSelector).toContainText("Zeta family");

    await page.reload({ waitUntil: "networkidle" });
    await expect(screen.groupSelector).toContainText("Zeta family");
    await screen.tab("people").click();

    await expect(page).toHaveURL("/people");
    await expect(screen.groupSelector).toContainText("Zeta family");
  });
});

test.describe("screen states", () => {
  test("BR-13 a member who doesn't buy opens To buy", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/to-buy");
    const screen = shell(page, "en");

    await expect(screen.notAvailable).toBeVisible();
    await expect(screen.nav).toBeVisible();
    await expect(screen.header).toBeVisible();
  });

  test("BR-13 a user who is only a buyer opens Lists", async ({ page }) => {
    await signInAsSeedUser(page, "juan");
    await page.goto("/lists");

    await expect(shell(page, "es").notAvailable).toBeVisible();
    await page
      .getByRole("link", { name: messages.es.states.goToStart })
      .click();
    await expect(page).toHaveURL("/to-buy");
  });

  test('BR-13 a missing address shows "not available"', async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/no-such-screen");

    await expect(shell(page, "en").notAvailable).toBeVisible();
    await page
      .getByRole("link", { name: messages.en.states.goToStart })
      .click();
    await expect(page).toHaveURL("/lists");
  });

  test("BR-11 the former buyer sees the notice and My purchases", async ({
    page,
  }) => {
    await signInAsSeedUser(page, "pedro");
    await page.goto("/");

    await expect(page).toHaveURL("/purchases");
    await expect(page.getByText(messages.es.states.notInGroup)).toBeVisible();
    await expect(
      page.getByText(messages.es.states.askForInvitation),
    ).toBeVisible();
    await expectTabs(page, "es", ["purchases"]);
  });

  test("T-05 a placeholder screen uses the empty state", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/people");
    const screen = shell(page, "en");

    await expect(screen.heading(messages.en.tabs.people)).toBeVisible();
    await expect(
      page.getByText(messages.en.placeholder.comingSoon),
    ).toBeVisible();
  });

  test("T-05 a loading screen shows skeletons inside the shell", async ({
    page,
  }) => {
    await signUpOnboarded(page, { language: "en" });
    await open(page, "/lists");
    const screen = shell(page, "en");
    // Holds back the server's answer for People, so the loading state shows.
    // Prefetches go through at once: they bring the loading state itself.
    await page.route("**/people**", async (route) => {
      const headers = route.request().headers();
      if (headers["rsc"] && !headers["next-router-prefetch"]) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      await route.continue();
    });

    await screen.tab("people").click();

    await expect(
      page.getByRole("status").filter({ hasText: messages.en.states.loading }),
    ).toBeAttached();
    await expect(screen.nav).toBeVisible();
    await expect(screen.header).toBeVisible();
    await expect(screen.heading(messages.en.tabs.people)).toBeVisible();
  });
});

test.describe("languages and accessibility", () => {
  test("AC-99 the shell in English", async ({ page }) => {
    await signUpOnboarded(page, { language: "en" });
    await page.goto("/lists");
    const screen = shell(page, "en");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(messages.en.lists.title);
    await expectTabs(page, "en", ["lists", "people", "group"]);
    await expect(screen.nav).toBeVisible();
    await expect(screen.refresh).toBeVisible();
    await expect(screen.avatar).toBeVisible();
    await expect(
      page.getByRole("link", { name: messages.en.shell.skipToContent }),
    ).toBeAttached();
  });

  test("FR-37 the shell in Spanish", async ({ page }) => {
    await signUpOnboarded(page, { language: "es" });
    await page.goto("/lists");
    const screen = shell(page, "es");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expectTabs(page, "es", ["lists", "people", "group"]);
    await expect(screen.refresh).toBeVisible();
    await expect(screen.avatar).toBeVisible();
  });

  for (const language of ["es", "en"] as const) {
    test(`T-05 the shell has no accessibility violations (${language})`, async ({
      page,
    }) => {
      const email = await signUpOnboarded(page, { language });
      await addMemberGroup(email, "Zeta family");
      const screen = shell(page, language);

      await open(page, "/lists");
      await expect(screen.nav).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await page.goto("/people");
      await expect(
        screen.heading(messages[language].tabs.people),
      ).toBeVisible();
      await expectNoAccessibilityViolations(page);

      await screen.groupSelector.click();
      await expect(page.getByRole("menu")).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });

    test(`T-19 the "not available" and loading states have no accessibility violations (${language})`, async ({
      page,
    }) => {
      await signUpOnboarded(page, { language });
      const {
        lists: [first],
      } = await myGroup(page);
      const item = await createItem(page, first!.id, { name: "Milk" });
      const screen = shell(page, language);
      const t = messages[language];
      const loading = page
        .getByRole("status")
        .filter({ hasText: t.states.loading });

      await page.goto("/no-such-screen");
      await expect(screen.notAvailable).toBeVisible();
      await expectNoAccessibilityViolations(page);

      // People, Lists, and the item page, each held in its loading state.
      await open(page, "/lists");
      let release = await holdScreen(page, "**/people**");
      await screen.tab("people").click();
      await expect(loading).toBeAttached();
      await expectNoAccessibilityViolations(page);
      release();
      await expect(page.getByText(t.placeholder.comingSoon)).toBeVisible();

      release = await holdScreen(page, "**/lists**");
      await screen.tab("lists").click();
      await expect(loading).toBeAttached();
      await expectNoAccessibilityViolations(page);
      release();
      const row = page.getByRole("link", { name: /Milk/ });
      await expect(row).toBeVisible();

      release = await holdScreen(page, `**/items/${item.id}**`);
      await row.click();
      await expect(loading).toBeAttached();
      await expectNoAccessibilityViolations(page);
      release();
      await expect(screen.heading("Milk")).toBeVisible();
    });
  }

  test("T-19 a buyer's shell and the former buyer's notice have no accessibility violations", async ({
    page,
  }) => {
    // Seed users, who use the app in Spanish; this test only looks.
    await signInAsSeedUser(page, "juan");
    await page.goto("/");
    await expect(page).toHaveURL("/to-buy");
    await expectTabs(page, "es", ["toBuy", "purchases"]);
    await expectNoAccessibilityViolations(page);

    await signInAsSeedUser(page, "pedro");
    await page.goto("/");
    await expect(page).toHaveURL("/purchases");
    await expect(page.getByText(messages.es.states.notInGroup)).toBeVisible();
    await expectNoAccessibilityViolations(page);
  });

  test("T-05 the shell can be used with the keyboard", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "webkit",
      "Safari moves focus to links only with Option-Tab; Chromium covers keyboard use.",
    );
    const email = await signUpOnboarded(page, { language: "en" });
    await addMemberGroup(email, "Zeta family");
    await open(page, "/lists");
    const screen = shell(page, "en");
    const skipLink = page.getByRole("link", {
      name: messages.en.shell.skipToContent,
    });

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    const resting = await ringLook(screen.groupSelector);
    await page.keyboard.press("Tab");
    await expect(screen.groupSelector).toBeFocused();
    // Focus shows a ring, whether it's drawn as an outline or a box shadow.
    const focused = await ringLook(screen.groupSelector);
    expect(focused.outlineShown || focused.boxShadow !== "none").toBe(true);
    expect([focused.outline, focused.boxShadow]).not.toEqual([
      resting.outline,
      resting.boxShadow,
    ]);

    await page.keyboard.press("Enter");
    // Opened from the keyboard, the menu moves focus to its first group, the
    // user's own, which sorts before "Zeta family".
    const groups = page.getByRole("menuitemradio");
    await expect(groups).toHaveCount(2);
    await expect(groups.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitemradio", { name: "Zeta family" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(screen.groupSelector).toContainText("Zeta family");

    await page.keyboard.press("Tab");
    await expect(screen.refresh).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(screen.avatar).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(screen.tab("lists")).toBeFocused();
  });
});
