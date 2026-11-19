"use client";

import {
  ArrowLeftIcon,
  EllipsisIcon,
  PencilIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";

import { sendJson } from "@/components/api";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemAction } from "@/shared/items";

import { useItemRefusal } from "./item-refusals";

// The item page's frame and actions (docs/02-UX-DESIGN.md, sections 2.4 and
// 2.5; design decision 7): Back, the item's name, the ⋯ menu, the main button,
// and the delete confirmation. A refused action shows why and refreshes
// (BR-20, BR-23). The details between come from the server.

export function ItemActions({
  item,
  backHref,
  main,
  menu,
  children,
}: {
  item: { id: string; name: string; listId: string };
  backHref: string;
  main: ItemAction | null;
  menu: readonly ItemAction[];
  children: ReactNode;
}) {
  const t = useTranslations("item");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const handleRefusal = useItemRefusal();
  const menuButton = useRef<HTMLButtonElement>(null);

  const [alert, setAlert] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState<ItemAction>();

  const editHref = `/items/${item.id}/edit`;

  async function reserve() {
    setAlert(undefined);
    setPending("reserve");
    const result = await sendJson(
      `/items/${item.id}/reservation`,
      "POST",
      undefined,
    );
    setPending(undefined);
    if (result.ok) router.refresh();
    else setAlert(handleRefusal(result));
  }

  async function remove() {
    setAlert(undefined);
    setPending("delete");
    const result = await sendJson(`/items/${item.id}`, "DELETE", undefined);
    setPending(undefined);
    if (result.ok) {
      router.push(`/lists?list=${item.listId}`);
      return;
    }
    setConfirming(false);
    setAlert(handleRefusal(result));
  }

  return (
    <article className="flex min-w-0 flex-col gap-5">
      <header className="flex items-start gap-2">
        <Button asChild variant="secondary" className="px-3">
          <Link href={backHref} aria-label={t("back")}>
            <ArrowLeftIcon aria-hidden />
          </Link>
        </Button>
        <h1 className="text-headline-xl-mobile md:text-headline-xl min-w-0 flex-1 self-center font-bold [overflow-wrap:anywhere]">
          {item.name}
        </h1>
        {menu.length > 0 && (
          // Not modal, like the other menus: a modal menu hides the page from
          // screen readers while its controls stay focusable.
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={menuButton}
                variant="secondary"
                className="px-3"
                aria-label={t("moreActions")}
              >
                <EllipsisIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={16}>
              {menu.includes("edit") && (
                <DropdownMenuItem asChild>
                  <Link href={editHref}>
                    <PencilIcon aria-hidden />
                    {t("edit")}
                  </Link>
                </DropdownMenuItem>
              )}
              {menu.includes("delete") && (
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setConfirming(true)}
                >
                  <Trash2Icon aria-hidden />
                  {t("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {alert && <FormAlert>{alert}</FormAlert>}

      {children}

      {main === "reserve" && (
        <Button
          onClick={reserve}
          disabled={pending !== undefined}
          aria-busy={pending === "reserve"}
        >
          <ShoppingCartIcon aria-hidden />
          {t("reserve")}
        </Button>
      )}
      {main === "edit" && (
        <Button asChild>
          <Link href={editHref}>
            <PencilIcon aria-hidden />
            {t("edit")}
          </Link>
        </Button>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            // The menu item that opened the dialog is gone; the menu button
            // takes the focus back.
            event.preventDefault();
            menuButton.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("deleteTitle", { name: item.name })}</DialogTitle>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{tCommon("cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={pending !== undefined}
              aria-busy={pending === "delete"}
            >
              <Trash2Icon aria-hidden />
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
