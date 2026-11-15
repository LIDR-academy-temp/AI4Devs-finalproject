"use client";

import { ChevronRightIcon, UsersIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";

import { cn } from "@/components/ui/utils";
import type { ItemView } from "@/server/services/items";
import {
  applyFilters,
  arrangeItems,
  filterChoices,
  type Filters,
  NO_FILTERS,
} from "@/shared/items";

import { ItemCard } from "./item-card";
import { StatusIcon, statusColors } from "./status-chip";

// The list's items with the person and status filters (docs/02-UX-DESIGN.md,
// section 2.4; design decision 3). Filters are kept here, over the loaded
// list, and start over when the list changes, since the page keys this by
// list. Shipped items are in a collapsed section at the end.

// A filter chip (DESIGN.md, Status Chips): 48px tall, filled with the primary
// color when chosen. A status chip at rest wears its status's colors, so it
// reads like the chips on the items below it. Choosing one changes it at once,
// with no fade through colors that would read poorly.
function Chip({
  pressed,
  onClick,
  colors,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  colors?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "text-label-lg focus-visible:ring-ring inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-left font-semibold [overflow-wrap:anywhere] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 [&_svg]:size-5 [&_svg]:shrink-0",
        pressed
          ? "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover"
          : (colors ?? "border-border bg-card text-foreground hover:bg-muted"),
        !pressed && colors && "hover:border-current",
      )}
    >
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-label-lg text-muted-foreground">
        {label}
      </span>
      {/* Wraps onto more lines, so every chip is in view with no sideways
          scrolling (DESIGN.md, Radical Clarity). */}
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

export function FilteredItems({
  items,
  userId,
  openItemId,
}: {
  items: readonly ItemView[];
  userId: string;
  openItemId?: string;
}) {
  const t = useTranslations("lists");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [shippedOpen, setShippedOpen] = useState(false);
  const shippedId = useId();

  const choices = filterChoices(items, locale);
  const { open, shipped } = arrangeItems(applyFilters(items, filters));
  const showShipped = shippedOpen || filters.status === "shipped";

  function setFilter(next: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <ChipRow label={t("byPerson")}>
          <Chip
            pressed={filters.person === "all"}
            onClick={() => setFilter({ person: "all" })}
          >
            <UsersIcon aria-hidden />
            {t("all")}
          </Chip>
          {choices.people.map(({ id, name }) => (
            <Chip
              key={id}
              pressed={filters.person === id}
              onClick={() => setFilter({ person: id })}
            >
              {name}
            </Chip>
          ))}
          {choices.hasNoPerson && (
            <Chip
              pressed={filters.person === "none"}
              onClick={() => setFilter({ person: "none" })}
            >
              {t("noPerson")}
            </Chip>
          )}
        </ChipRow>
        <ChipRow label={t("byStatus")}>
          <Chip
            pressed={filters.status === "all"}
            onClick={() => setFilter({ status: "all" })}
          >
            {t("all")}
          </Chip>
          {choices.statuses.map(({ status, count }) => (
            <Chip
              key={status}
              pressed={filters.status === status}
              onClick={() => setFilter({ status })}
              colors={statusColors(status)}
            >
              <StatusIcon status={status} />
              {tStatus(status)}
              <span className="-ml-1 font-medium">({count})</span>
            </Chip>
          ))}
        </ChipRow>
      </div>

      {open.length === 0 && shipped.length === 0 && (
        <p className="text-body-lg text-muted-foreground py-4 text-center">
          {t("noMatches")}
        </p>
      )}

      {open.length > 0 && (
        <ul className="flex flex-col gap-3">
          {open.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              userId={userId}
              open={item.id === openItemId}
            />
          ))}
        </ul>
      )}

      {shipped.length > 0 && (
        <section className="flex flex-col gap-3">
          {/* DESIGN.md, Collapsible Section Header: a full-width bar. */}
          <h2>
            <button
              type="button"
              aria-expanded={showShipped}
              aria-controls={shippedId}
              onClick={() => setShippedOpen(!showShipped)}
              className="text-headline-md border-secondary-foreground/30 bg-secondary text-foreground hover:border-secondary-foreground/60 focus-visible:ring-ring flex min-h-13 w-full items-center gap-3 rounded-xl border-[1.5px] px-4 text-left font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <ChevronRightIcon
                className={cn(
                  "size-6 transition-transform motion-reduce:transition-none",
                  showShipped && "rotate-90",
                )}
                aria-hidden
              />
              {t("shipped", { count: shipped.length })}
            </button>
          </h2>
          <ul
            id={shippedId}
            hidden={!showShipped}
            className="flex flex-col gap-3"
          >
            {shipped.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userId={userId}
                open={item.id === openItemId}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
