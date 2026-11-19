import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/server/db/client";
import { getCurrentUser } from "@/server/services/me";
import {
  chooseCurrentGroup,
  CURRENT_GROUP_COOKIE,
  mainScreenPath,
  sortGroupsByName,
  type Tab,
  visibleTabs,
} from "@/shared/navigation";

import { requireOnboardedUser } from "./require-user";

// What the shell and the screens inside it need about the signed-in user, read
// once per request and shared by the layout and the page (design decision 1 of
// the T-05 change).

export const loadShell = cache(async () => {
  const sessionUser = await requireOnboardedUser();
  const user = await getCurrentUser(db, sessionUser.id);
  const tabs = visibleTabs(user);
  // Sorted here, not by the database, whose order depends on its collation.
  const memberGroups = sortGroupsByName(
    user.memberships.filter(({ type }) => type === "member"),
  );
  const remembered = (await cookies()).get(CURRENT_GROUP_COOKIE)?.value;
  return {
    user,
    tabs,
    memberGroups,
    currentGroup: chooseCurrentGroup(memberGroups, remembered),
    mainScreen: mainScreenPath(tabs),
  };
});

export type ShellData = Awaited<ReturnType<typeof loadShell>>;

/**
 * The shell data, for a screen that belongs to `tab`. A user without that tab
 * gets the "not available" state, the same as for an address that doesn't
 * exist (BR-13).
 */
export async function requireTab(tab: Tab): Promise<ShellData> {
  const shell = await loadShell();
  if (!shell.tabs.includes(tab)) notFound();
  return shell;
}
