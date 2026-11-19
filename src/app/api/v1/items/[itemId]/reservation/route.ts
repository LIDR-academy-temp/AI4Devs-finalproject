import { defineRoute } from "@/server/http/route";

import { deleteReservation, postReservation } from "./definitions";

export const POST = defineRoute(postReservation);
export const DELETE = defineRoute(deleteReservation);
