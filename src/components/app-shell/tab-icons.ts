import {
  HouseIcon,
  ListChecksIcon,
  type LucideIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "lucide-react";

import type { Tab } from "@/shared/navigation";

// One icon per tab, shown next to its name (DESIGN.md, Navigation).
export const TAB_ICONS: Record<Tab, LucideIcon> = {
  lists: ListChecksIcon,
  people: UsersIcon,
  group: HouseIcon,
  toBuy: ShoppingCartIcon,
  purchases: ShoppingBagIcon,
};
