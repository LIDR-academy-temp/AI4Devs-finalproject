import type { ReactNode } from "react";

import { AppShell, initialsOf } from "@/components/app-shell/app-shell";

import { loadShell } from "./shell-data";

// Screens for a signed-in user who has completed onboarding, inside the app
// shell. Anyone else goes to Welcome or One last step (design decision 5 of the
// T-04 change).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, tabs, memberGroups, currentGroup } = await loadShell();

  return (
    <AppShell
      tabs={tabs}
      memberGroups={memberGroups.map(({ groupId, groupName }) => ({
        groupId,
        groupName,
      }))}
      currentGroupId={currentGroup?.groupId}
      inAnyGroup={user.memberships.length > 0}
      initials={initialsOf(user.name, user.email)}
    >
      {children}
    </AppShell>
  );
}
