"use client";

import { CheckIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "./utils";

// The shadcn/ui dropdown menu, with the parts the app uses, styled to DESIGN.md:
// items at least 48px tall, 16px text, and the popover tokens.

export function DropdownMenu(
  props: ComponentProps<typeof DropdownMenuPrimitive.Root>,
) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

export function DropdownMenuTrigger(
  props: ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "border-border bg-popover text-popover-foreground shadow-floating z-50 max-h-(--radix-dropdown-menu-content-available-height) max-w-[calc(100vw-2rem)] min-w-56 overflow-y-auto rounded-xl border-[1.5px] p-1.5",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        "text-body-md text-muted-foreground px-3 py-2 font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioGroup(
  props: ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "text-body-lg data-highlighted:bg-muted data-[state=checked]:text-primary relative flex min-h-12 cursor-default items-center gap-3 rounded-md py-2 pr-3 pl-10 font-medium break-words outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <span className="absolute left-3 flex size-5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-5" aria-hidden />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "text-body-lg data-highlighted:bg-muted relative flex min-h-12 cursor-default items-center gap-3 rounded-md px-3 py-2 font-medium break-words outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1.5 my-1.5 h-px", className)}
      {...props}
    />
  );
}
