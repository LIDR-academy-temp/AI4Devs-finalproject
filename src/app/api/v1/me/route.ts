import { defineRoute } from "@/server/http/route";

import { getMe, patchMe } from "./definitions";

export const GET = defineRoute(getMe);
export const PATCH = defineRoute(patchMe);
