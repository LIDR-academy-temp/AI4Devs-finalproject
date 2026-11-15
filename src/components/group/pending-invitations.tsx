"use client";

import { ClockIcon, SendIcon, XCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { sendJson } from "@/components/api";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { daysUntil } from "@/shared/invitations";

// The pending invitations on Group (FR-06; docs/02-UX-DESIGN.md, section 2.4):
// the invitee's name, or the type when there is none, "Invited as {type}",
// when it expires, and Cancel invitation. Cancelling confirms with a toast; a
// refusal stays on its row (section 2.7).

export type PendingInvitation = {
  id: string;
  type: "member" | "buyer";
  inviteeName: string | null;
  expiresAt: string;
};

export function PendingInvitations({
  invitations,
  now,
}: {
  invitations: readonly PendingInvitation[];
  /** The server's time when Group loaded. */
  now: string;
}) {
  const t = useTranslations("group");
  if (invitations.length === 0) return null;
  return (
    <div className="border-border flex flex-col gap-3 border-t pt-4">
      <h2 className="text-label-lg text-muted-foreground">
        {t("pendingInvitations", { count: invitations.length })}
      </h2>
      <ul className="flex flex-col gap-3">
        {invitations.map((invitation) => (
          <PendingRow key={invitation.id} invitation={invitation} now={now} />
        ))}
      </ul>
    </div>
  );
}

function PendingRow({
  invitation,
  now,
}: {
  invitation: PendingInvitation;
  now: string;
}) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [alert, setAlert] = useState<string>();

  async function cancel() {
    setPending(true);
    setAlert(undefined);
    const result = await sendJson<null>(
      `/invitations/${invitation.id}`,
      "DELETE",
      undefined,
    );
    if (result.ok) {
      toast(t("invitationCancelled"));
      router.refresh();
      return;
    }
    setPending(false);
    setAlert(
      "offline" in result
        ? tCommon("couldNotSave")
        : result.error.message || tCommon("couldNotSave"),
    );
  }

  const name =
    invitation.inviteeName ?? tCommon(`membershipTypes.${invitation.type}`);

  return (
    <li className="bg-muted flex flex-col gap-3 rounded-xl p-4">
      {alert && <FormAlert>{alert}</FormAlert>}
      <div className="flex items-start gap-3">
        <span className="bg-card text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
          <SendIcon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-label-lg break-words">{name}</p>
          <p className="text-body-md text-muted-foreground">
            {t("invitedAs", { type: invitation.type })}
          </p>
          <p className="bg-status-reserved-bg text-status-reserved-text text-body-md inline-flex items-center gap-1 self-start rounded-full px-3 py-0.5">
            <ClockIcon className="size-4" aria-hidden />
            {t("expires", {
              count: daysUntil(new Date(invitation.expiresAt), new Date(now)),
            })}
          </p>
        </div>
      </div>
      <Button
        variant="destructive"
        className="self-stretch sm:self-end"
        disabled={pending}
        aria-busy={pending}
        onClick={cancel}
      >
        <XCircleIcon aria-hidden />
        {t("cancelInvitation")}
      </Button>
    </li>
  );
}
