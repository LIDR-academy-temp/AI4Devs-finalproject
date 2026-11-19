import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { GroupHeader } from "@/components/group/group-header";
import { InviteButton } from "@/components/group/invite-sheet";
import { PeopleSection } from "@/components/group/people-section";
import { PendingInvitations } from "@/components/group/pending-invitations";
import { systemClock } from "@/server/clock";
import { db } from "@/server/db/client";
import { getGroup } from "@/server/services/groups";
import { listInvitations } from "@/server/services/invitations";
import type { Language } from "@/shared/languages";

import { requireTab } from "../shell-data";

// Group (docs/02-UX-DESIGN.md, section 2.4; FR-06, FR-07): the current group,
// inviting members and buyers, the pending invitations, and its people.
// Delivery addresses come with T-15.

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tabs");
  return { title: t("group") };
}

export default async function GroupPage() {
  const { user, currentGroup } = await requireTab("group");
  // The Group tab requires a member group, and the current group is one.
  if (!currentGroup) return null;
  const { groupId } = currentGroup;
  const language = (await getLocale()) as Language;
  // One time for the whole screen, so every expiry reads the same.
  const now = systemClock();

  const [group, invitations] = await Promise.all([
    getGroup(db, user.id, groupId, language),
    listInvitations(db, () => now, user.id, groupId),
  ]);
  const owner = group.members.find(({ isOwner }) => isOwner);
  const me = group.members.find(({ id }) => id === user.id);

  const invite = {
    groupId,
    groupName: group.name,
    inviterName: me?.name ?? "",
  };

  return (
    <>
      <GroupHeader name={group.name} ownerName={owner?.name ?? ""} />
      <section className="border-border bg-card shadow-card flex flex-col gap-3 rounded-xl border-[1.5px] p-5">
        <InviteButton type="member" {...invite} />
        <InviteButton type="buyer" {...invite} />
        <PendingInvitations invitations={invitations} now={now.toISOString()} />
      </section>
      <PeopleSection
        members={group.members}
        buyers={group.buyers}
        inviteBuyer={<InviteButton type="buyer" {...invite} />}
      />
    </>
  );
}
