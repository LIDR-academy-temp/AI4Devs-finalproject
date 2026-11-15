import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cn } from "@/components/ui/utils";
import type { ItemView } from "@/server/services/items";

import { ItemStatusChip, StatusIcon, statusColors } from "./status-chip";

// One item on Lists (docs/02-UX-DESIGN.md, section 2.4; DESIGN.md, Cards &
// List Rows): the status icon, its name, who it is for, its quantity, and the
// status chip at the top right, opening its page. The chip moves under the
// name when the name would get too narrow to read. An unavailable item has the
// unavailable surface, since it waits for a member's decision. The open item,
// beside the list on desktop, has the selected border (DESIGN.md, Border
// Hierarchy).

export function ItemCard({
  item,
  userId,
  open,
}: {
  item: ItemView;
  userId: string;
  open: boolean;
}) {
  const t = useTranslations("item");
  const unavailable = item.status === "unavailable";
  return (
    <li>
      <Link
        href={`/items/${item.id}`}
        aria-current={open ? "page" : undefined}
        className={cn(
          "shadow-card focus-visible:ring-ring flex gap-3 rounded-lg p-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none",
          unavailable
            ? "border-status-unavailable-border bg-status-unavailable-bg hover:border-destructive"
            : "border-border bg-card hover:border-input",
          open
            ? "border-primary hover:border-primary border-2 p-[15.5px]"
            : "border-[1.5px]",
        )}
      >
        {/* Decorative: the chip says the status in words. */}
        <span
          aria-hidden
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px]",
            statusColors(item.status),
          )}
        >
          <StatusIcon status={item.status} className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <span className="text-headline-md min-w-0 flex-[1_1_7rem] pt-1.5 [overflow-wrap:anywhere]">
              {item.name}
            </span>
            <ItemStatusChip item={item} userId={userId} />
          </span>
          <span className="text-body-md text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2">
            {item.recipient && (
              <span className="flex min-w-0 items-center gap-1.5 [overflow-wrap:anywhere]">
                <UserIcon className="size-5 shrink-0" aria-hidden />
                {t("for", { name: item.recipient.name })}
              </span>
            )}
            <span className="bg-secondary text-secondary-foreground rounded-sm px-2 py-0.5 font-medium">
              {t("quantity", { count: item.quantity })}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
