import { defineRoute } from "@/server/http/route";

import { getToBuy } from "./definitions";

export const GET = defineRoute(getToBuy);
