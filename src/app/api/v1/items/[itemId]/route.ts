import { defineRoute } from "@/server/http/route";

import { deleteItemById, getItemById, patchItem } from "./definitions";

export const GET = defineRoute(getItemById);
export const PATCH = defineRoute(patchItem);
export const DELETE = defineRoute(deleteItemById);
