import { defineRoute } from "@/server/http/route";

import { postOnboarding } from "./definitions";

export const POST = defineRoute(postOnboarding);
