"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// The user's initials, which open Profile (docs/02-UX-DESIGN.md, section 2.2).
// The Google photo isn't loaded (design decision 7 of the T-05 change).
export function UserAvatar({ initials }: { initials: string }) {
  const t = useTranslations("shell");
  const current = usePathname() === "/profile";
  return (
    <Link
      href="/profile"
      aria-label={t("profile")}
      aria-current={current ? "page" : undefined}
      className="bg-primary text-label-lg text-primary-foreground hover:bg-primary-hover focus-visible:ring-ring aria-[current=page]:ring-primary flex size-12 shrink-0 items-center justify-center rounded-full font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 aria-[current=page]:ring-2 aria-[current=page]:ring-offset-2"
    >
      <span aria-hidden>{initials}</span>
    </Link>
  );
}
