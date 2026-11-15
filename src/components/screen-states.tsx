import {
  CircleSlashIcon,
  HouseIcon,
  type LucideIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

// The shared states from docs/02-UX-DESIGN.md, section 2.7: each says what is
// going on in plain words and offers a way forward (section 2.1, principle 7).
// They render on the server; the error state, which needs the browser, is in
// screen-error.tsx.

/** Nothing to show yet: an icon, guidance on what to do next, and an optional action. */
export function EmptyState({
  icon: Icon,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-border bg-card shadow-card flex flex-col items-center gap-4 rounded-xl border-[1.5px] px-5 py-8 text-center",
        className,
      )}
    >
      <span className="bg-accent text-accent-foreground flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="text-body-xl max-w-prose">{children}</p>
      {action}
    </section>
  );
}

/**
 * The same answer for an address that doesn't exist and one the user can't
 * see (BR-13), with a button to their main screen.
 */
export function NotAvailable({ href }: { href: string }) {
  const tErrors = useTranslations("errors");
  const tStates = useTranslations("states");
  return (
    <section className="flex flex-col items-center gap-6 py-8 text-center">
      <CircleSlashIcon className="text-muted-foreground size-12" aria-hidden />
      <h1 className="text-headline-lg font-bold">{tErrors("NOT_AVAILABLE")}</h1>
      <Button asChild>
        <Link href={href}>
          <HouseIcon aria-hidden />
          {tStates("goToStart")}
        </Link>
      </Button>
    </section>
  );
}

/** Shown above every screen to a user with no active membership (BR-11, FR-08). */
export function NoGroupNotice() {
  const t = useTranslations("states");
  return (
    <section className="border-secondary-foreground/30 bg-secondary text-secondary-foreground flex items-start gap-3 rounded-xl border-[1.5px] p-4">
      <UsersIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-body-xl font-semibold">{t("notInGroup")}</p>
        <p className="text-body-lg">{t("askForInvitation")}</p>
      </div>
    </section>
  );
}
