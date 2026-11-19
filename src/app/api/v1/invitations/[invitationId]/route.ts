import { defineRoute } from "@/server/http/route";

import { deleteInvitation } from "./definitions";

export const DELETE = defineRoute(deleteInvitation);
