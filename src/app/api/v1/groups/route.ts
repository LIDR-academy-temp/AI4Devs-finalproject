import { defineRoute } from "@/server/http/route";

import { getGroups } from "./definitions";

export const GET = defineRoute(getGroups);
