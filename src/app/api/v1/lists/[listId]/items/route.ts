import { defineRoute } from "@/server/http/route";

import { getListItems, postListItem } from "./definitions";

export const GET = defineRoute(getListItems);
export const POST = defineRoute(postListItem);
