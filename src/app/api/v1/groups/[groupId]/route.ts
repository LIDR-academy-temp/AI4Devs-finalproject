import { defineRoute } from "@/server/http/route";

import { getGroupById } from "./definitions";

export const GET = defineRoute(getGroupById);
