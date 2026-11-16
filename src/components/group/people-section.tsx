import { ShoppingBagIcon, StarIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { initialsOf } from "@/components/app-shell/app-shell";
import { EmptyState } from "@/components/screen-states";
import { formatInternational } from "@/shared/phone";

// The people in the group (FR-07, BR-04, BR-12; docs/02-UX-DESIGN.md, section
// 2.4): the members with their emails and the Owner tag, and the buyers with
// their WhatsApp numbers. With no buyers, the section invites one (section 2.7).

type Member = {
  id: string;
  name: string;
  isOwner: boolean;
  email: string | null;
};

type Buyer = { id: string; name: string; whatsappNumber: string | null };

function PersonRow({
  name,
  detail,
  tag,
}: {
  name: string;
  detail: string | null;
  tag?: ReactNode;
}) {
  return (
    <li className="border-border bg-card flex items-center gap-3 rounded-xl border-[1.5px] p-4">
      <span
        className="bg-primary text-primary-foreground text-label-lg flex size-11 shrink-0 items-center justify-center rounded-full"
        aria-hidden
      >
        {initialsOf(name, null)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-label-lg break-words">{name}</p>
        {detail && (
          <p className="text-body-md text-muted-foreground break-all">
            {detail}
          </p>
        )}
      </div>
      {tag}
    </li>
  );
}

export function PeopleSection({
  members,
  buyers,
  inviteBuyer,
}: {
  members: readonly Member[];
  buyers: readonly Buyer[];
  /** Invite a buyer, for the empty state. */
  inviteBuyer: ReactNode;
}) {
  const t = useTranslations("group");
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-headline-md flex items-center gap-2 font-bold">
          <UsersIcon className="text-primary size-6" aria-hidden />
          {t("members")}
        </h2>
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <PersonRow
              key={member.id}
              name={member.name}
              detail={member.email}
              tag={
                member.isOwner && (
                  <span className="bg-accent text-accent-foreground text-body-md inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 font-semibold">
                    <StarIcon className="size-4" aria-hidden />
                    {t("owner")}
                  </span>
                )
              }
            />
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-headline-md flex items-center gap-2 font-bold">
          <ShoppingBagIcon className="text-primary size-6" aria-hidden />
          {t("buyers")}
        </h2>
        {buyers.length === 0 ? (
          <EmptyState icon={ShoppingBagIcon} action={inviteBuyer}>
            {t("noBuyers")}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {buyers.map((buyer) => (
              <PersonRow
                key={buyer.id}
                name={buyer.name}
                detail={
                  buyer.whatsappNumber &&
                  formatInternational(buyer.whatsappNumber)
                }
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
