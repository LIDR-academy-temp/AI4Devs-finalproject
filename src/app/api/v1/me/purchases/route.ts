import { defineRoute } from "@/server/http/route";

import { getPurchases } from "./definitions";

export const GET = defineRoute(getPurchases);
