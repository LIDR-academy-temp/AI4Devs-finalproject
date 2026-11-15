import { UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";

// The top of Group (docs/02-UX-DESIGN.md, section 2.4): the group's name, and
// the subtitle naming its owner.

export function GroupHeader({
  name,
  ownerName,
}: {
  name: string;
  ownerName: string;
}) {
  const t = useTranslations("group");
  return (
    <header className="bg-muted flex flex-col gap-2 rounded-xl p-5">
      <h1 className="text-headline-xl-mobile md:text-headline-xl flex items-start gap-2 font-bold break-words">
        <UsersIcon className="text-primary mt-1 size-7 shrink-0" aria-hidden />
        <span className="min-w-0">{name}</span>
      </h1>
      <p className="text-body-lg text-muted-foreground">
        {t("managedBy", { name: ownerName })}
      </p>
    </header>
  );
}
