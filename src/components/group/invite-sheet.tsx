"use client";

import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  MessageCircleIcon,
  ShoppingBagIcon,
  UserPlusIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { sendJson } from "@/components/api";
import { FormAlert } from "@/components/form-alert";
import { CharacterCount, showsCount } from "@/components/lists/character-count";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/components/ui/utils";
import { daysUntil } from "@/shared/invitations";
import { fieldLimits } from "@/shared/limits";

// Invite a member or Invite a buyer, and the sheet it opens (FR-06;
// docs/02-UX-DESIGN.md, sections 1, flow C, and 2.4): the optional name, then
// the link with Share on WhatsApp, Copy link, and when it expires. Creating a
// link shows no toast; the sheet itself shows it. Closing the sheet after
// creating one refreshes Group, so the invitation is among the pending ones.

type MembershipType = "member" | "buyer";

type Created = { link: string; expiresAt: string; inviteeName: string | null };

const COPIED_FOR_MS = 3000;

export function InviteButton({
  type,
  groupId,
  groupName,
  inviterName,
  now,
  className,
}: {
  type: MembershipType;
  groupId: string;
  groupName: string;
  inviterName: string;
  /** The server's time when Group loaded, so the expiry reads the same everywhere. */
  now: string;
  className?: string;
}) {
  const t = useTranslations("group");
  const [open, setOpen] = useState(false);
  const label = type === "member" ? t("inviteMember") : t("inviteBuyer");
  const Icon = type === "member" ? UserPlusIcon : ShoppingBagIcon;
  return (
    <>
      <Button
        variant={type === "buyer" ? "primary" : "secondary"}
        className={cn("w-full", className)}
        onClick={() => setOpen(true)}
      >
        <Icon aria-hidden />
        {label}
      </Button>
      <InviteSheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        type={type}
        groupId={groupId}
        groupName={groupName}
        inviterName={inviterName}
        now={now}
      />
    </>
  );
}

function InviteSheet({
  open,
  onOpenChange,
  title,
  type,
  groupId,
  groupName,
  inviterName,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: MembershipType;
  groupId: string;
  groupName: string;
  inviterName: string;
  now: string;
}) {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [created, setCreated] = useState<Created>();
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  function changeOpen(next: boolean) {
    if (!next) {
      if (created) router.refresh();
      setName("");
      setCreated(undefined);
      setAlert(undefined);
      setCopied(false);
    }
    onOpenChange(next);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setAlert(undefined);
    setPending(true);
    const result = await sendJson<Created>(
      `/groups/${groupId}/invitations`,
      "POST",
      { type, inviteeName: name },
    );
    setPending(false);
    if (result.ok) {
      setCreated(result.data);
      return;
    }
    setAlert(
      "offline" in result
        ? tCommon("couldNotSave")
        : result.error.message || tCommon("couldNotSave"),
    );
    input.current?.focus();
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FOR_MS);
    } catch {
      setCopied(false);
    }
  }

  const countId = `${id}-count`;
  const max = fieldLimits.inviteeName.max;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {created ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-link`}>{t("invitationLink")}</Label>
              <Input
                id={`${id}-link`}
                value={created.link}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <p className="text-body-md bg-status-reserved-bg text-status-reserved-text rounded-lg px-3 py-2">
              {t("expires", {
                count: daysUntil(new Date(created.expiresAt), new Date(now)),
              })}
            </p>
            <Button asChild variant="whatsapp" className="w-full">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  t("invitationMessage", {
                    hasName: created.inviteeName ? "yes" : "no",
                    name: created.inviteeName ?? "",
                    inviter: inviterName,
                    group: groupName,
                    type,
                    link: created.link,
                  }),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircleIcon aria-hidden />
                {t("shareOnWhatsApp")}
              </a>
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => copy(created.link)}
            >
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
              {copied ? t("linkCopied") : t("copyLink")}
            </Button>
            <span aria-live="polite" className="sr-only">
              {copied ? t("linkCopied") : ""}
            </span>
          </div>
        ) : (
          <form onSubmit={create} noValidate className="flex flex-col gap-5">
            {alert && <FormAlert>{alert}</FormAlert>}
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-name`}>{t("inviteeName")}</Label>
              <Input
                ref={input}
                id={`${id}-name`}
                value={name}
                maxLength={max}
                autoComplete="off"
                aria-describedby={
                  showsCount(name.length, max) ? countId : undefined
                }
                onChange={(event) => setName(event.target.value)}
              />
              <CharacterCount id={countId} length={name.length} max={max} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                <LinkIcon aria-hidden />
                {t("createLink")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
