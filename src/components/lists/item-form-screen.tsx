import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { ItemForm } from "./item-form";

// The add and edit screens around the item form: Back and the title
// (docs/02-UX-DESIGN.md, section 2.4).

export function ItemFormScreen({
  mode,
  backHref,
  ...form
}: { mode: "add" | "edit"; backHref: string } & ComponentProps<
  typeof ItemForm
>) {
  const t = useTranslations("itemForm");
  const tItem = useTranslations("item");
  return (
    <>
      <header className="flex items-center gap-2">
        <Button asChild variant="secondary" className="px-3">
          <Link href={backHref} aria-label={tItem("back")}>
            <ArrowLeftIcon aria-hidden />
          </Link>
        </Button>
        <h1 className="text-headline-xl-mobile md:text-headline-xl font-bold">
          {mode === "add" ? t("addTitle") : t("editTitle")}
        </h1>
      </header>
      <ItemForm key={form.item?.id ?? "new"} {...form} />
    </>
  );
}
