"use client";

import { ChevronDownIcon, ShoppingBagIcon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { rememberGroup } from "@/components/current-group";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The left of the header (docs/02-UX-DESIGN.md, section 2.2): the group
// selector when the user is a member of two or more groups, the group's name
// with one, and the product name with none. Choosing a group remembers it on
// this device and reloads the screen (design decision 3 of the T-05 change).

// The name wraps to two lines before it is cut, so most group names stay whole
// next to Refresh and the avatar on a 360px screen.
const nameClass =
  "text-body-xl md:text-headline-md flex min-w-0 items-center gap-2 text-left font-bold [&_svg]:shrink-0";
const nameTextClass = "line-clamp-2 break-words";

export function GroupSelector({
  memberGroups,
  currentGroupId,
}: {
  memberGroups: readonly { groupId: string; groupName: string }[];
  currentGroupId: string | undefined;
}) {
  const t = useTranslations("shell");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = memberGroups.find(
    ({ groupId }) => groupId === currentGroupId,
  );

  if (!current) {
    return (
      <p className={nameClass}>
        <ShoppingBagIcon className="text-primary size-6" aria-hidden />
        <span className={nameTextClass}>{tCommon("appName")}</span>
      </p>
    );
  }

  if (memberGroups.length < 2) {
    return (
      <p className={nameClass}>
        <UsersIcon className="text-primary size-6" aria-hidden />
        <span className={nameTextClass}>{current.groupName}</span>
      </p>
    );
  }

  function choose(groupId: string) {
    if (groupId === currentGroupId) return;
    rememberGroup(groupId);
    startTransition(() => router.refresh());
  }

  return (
    // Not modal: a modal menu hides the page from screen readers while its
    // controls stay focusable, which the accessibility checks report.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-busy={pending || undefined}
        className={`${nameClass} hover:bg-muted focus-visible:ring-ring -ml-2 min-h-12 rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      >
        <UsersIcon className="text-primary size-6" aria-hidden />
        <span className="sr-only">{t("chooseGroup")}: </span>
        <span className={nameTextClass}>{current.groupName}</span>
        <ChevronDownIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={16}>
        <DropdownMenuLabel>{t("chooseGroup")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current.groupId} onValueChange={choose}>
          {memberGroups.map(({ groupId, groupName }) => (
            <DropdownMenuRadioItem key={groupId} value={groupId}>
              {groupName}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
