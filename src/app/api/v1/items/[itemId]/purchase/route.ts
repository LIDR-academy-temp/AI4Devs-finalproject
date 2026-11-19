import { defineRoute } from "@/server/http/route";

import { postPurchase } from "./definitions";

export const POST = defineRoute(postPurchase);
