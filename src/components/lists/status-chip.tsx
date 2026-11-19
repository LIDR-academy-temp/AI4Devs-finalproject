import {
  CircleIcon,
  ContrastIcon,
  type LucideIcon,
  TriangleAlertIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/utils";
import type { ItemStatus } from "@/shared/requests";

// An item's status with its icon, text, and colors, the same everywhere
// (DESIGN.md, Status Chips and Status Color Pairing Rules). The text is always
// there, so neither color nor icon is the only cue (docs/02-UX-DESIGN.md,
// section 2.5).

const styles: Record<ItemStatus, { icon: LucideIcon; className: string }> = {
  pending: {
    icon: CircleIcon,
    className:
      "border-status-pending-border bg-status-pending-bg text-status-pending-text",
  },
  reserved: {
    icon: ContrastIcon,
    className:
      "border-status-reserved-border bg-status-reserved-bg text-status-reserved-text",
  },
  purchased: {
    icon: CircleIcon,
    className:
      "border-status-purchased-border bg-status-purchased-bg text-status-purchased-text",
  },
  shipped: {
    icon: TruckIcon,
    className:
      "border-status-shipped-border bg-status-shipped-bg text-status-shipped-text",
  },
  unavailable: {
    icon: TriangleAlertIcon,
    className:
      "border-status-unavailable-border bg-status-unavailable-bg text-status-unavailable-text",
  },
};

/** A status's border, surface, and text colors, for anything that carries the status style. */
export function statusColors(status: ItemStatus): string {
  return styles[status].className;
}

/** A status's icon alone, always decorative: the status text sits beside it. */
export function StatusIcon({
  status,
  className,
}: {
  status: ItemStatus;
  className?: string;
}) {
  const { icon: Icon } = styles[status];
  return (
    <Icon
      className={cn(
        "shrink-0",
        status === "purchased" && "fill-current",
        className,
      )}
      aria-hidden
    />
  );
}

/** The chip, labeled with the status, or with `children` such as "Reserved by Juan". */
export function StatusChip({
  status,
  children,
  className,
}: {
  status: ItemStatus;
  children?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("status");
  return (
    <span
      data-status={status}
      className={cn(
        "text-label-lg inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 font-semibold",
        styles[status].className,
        className,
      )}
    >
      <StatusIcon status={status} className="size-4" />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {children ?? t(status)}
      </span>
    </span>
  );
}

/**
 * An item's chip, naming the buyer of a reserved or purchased item, or saying
 * "you" when it is the user (docs/02-UX-DESIGN.md, section 2.4).
 */
export function ItemStatusChip({
  item: { status, buyer },
  userId,
  className,
}: {
  item: { status: ItemStatus; buyer: { id: string; name: string } | null };
  userId: string;
  className?: string;
}) {
  const t = useTranslations("item");
  let text: string | undefined;
  if (buyer && (status === "reserved" || status === "purchased")) {
    const you = buyer.id === userId;
    text =
      status === "reserved"
        ? you
          ? t("reservedByYou")
          : t("reservedBy", { name: buyer.name })
        : you
          ? t("purchasedByYou")
          : t("purchasedBy", { name: buyer.name });
  }
  return (
    <StatusChip status={status} className={className}>
      {text}
    </StatusChip>
  );
}
