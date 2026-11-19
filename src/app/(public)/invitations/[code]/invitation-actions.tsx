"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { sendJson } from "@/components/api";
import { rememberGroup } from "@/components/current-group";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";

// Accept and Decline on the Invitation screen (flow C, steps 4 and 5). After
// accepting, a member lands on Lists showing the joined group and a buyer on To
// buy; after declining, Welcome sends the user to their main screen. If the
// invitation changed meanwhile, the screen is rendered again to show why.

type Accepted = { groupId: string; type: "member" | "buyer" };

const REFUSALS_THAT_CHANGE_THE_SCREEN = new Set([
  "INVITATION_INVALID",
  "NOT_AVAILABLE",
  "RULE_VIOLATION",
]);

export function InvitationActions({ code }: { code: string }) {
  const t = useTranslations("invitation");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [alert, setAlert] = useState<string>();

  async function send(action: "accept" | "decline") {
    setPending(action);
    setAlert(undefined);
    const result = await sendJson<Accepted | null>(
      `/invitations/by-code/${code}/${action}`,
      "POST",
      undefined,
    );
    if (result.ok) {
      if (action === "decline") {
        router.replace("/");
      } else if (result.data?.type === "member") {
        rememberGroup(result.data.groupId);
        router.replace("/lists");
      } else {
        router.replace("/to-buy");
      }
      return;
    }
    setPending(null);
    if ("offline" in result) {
      setAlert(tCommon("couldNotSave"));
    } else if (REFUSALS_THAT_CHANGE_THE_SCREEN.has(result.error.code)) {
      router.refresh();
    } else {
      setAlert(result.error.message || tCommon("couldNotSave"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {alert && <FormAlert>{alert}</FormAlert>}
      <Button
        className="w-full"
        disabled={pending !== null}
        aria-busy={pending === "accept"}
        onClick={() => send("accept")}
      >
        {t("accept")}
        <ArrowRightIcon aria-hidden />
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={pending !== null}
        aria-busy={pending === "decline"}
        onClick={() => send("decline")}
      >
        {t("decline")}
      </Button>
    </div>
  );
}
