import { defineRoute } from "@/server/http/route";

import { getLists, postList } from "./definitions";

export const GET = defineRoute(getLists);
export const POST = defineRoute(postList);
