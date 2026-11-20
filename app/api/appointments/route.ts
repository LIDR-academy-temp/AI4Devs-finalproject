import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/db";
import { rangesOverlap } from "../../../lib/services/slots";
import { checkRateLimit, clientIp } from "../../../lib/security/rateLimit";

const createAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)),
  clientName: z.string().trim().min(1).max(120),
  clientPhone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{6,14}$/, "Teléfono inválido, usa formato internacional (ej. +51987654321)"),
});

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`appointments:${clientIp(request)}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, intenta de nuevo en un momento" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { businessId, serviceId, startAt, clientName, clientPhone } = parsed.data;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found for this business" }, { status: 404 });
  }

  const start = new Date(startAt);
  const end = new Date(start.getTime() + service.durationMinutes * 60_000);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const dayStart = new Date(start);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(start);
      dayEnd.setHours(23, 59, 59, 999);

      const sameDayAppointments = await tx.appointment.findMany({
        where: {
          businessId,
          status: { not: "cancelled" },
          startAt: { gte: dayStart, lte: dayEnd },
        },
        select: { startAt: true, endAt: true },
      });

      const conflict = sameDayAppointments.some((appt) =>
        rangesOverlap(start, end, appt.startAt, appt.endAt)
      );
      if (conflict) {
        throw new SlotTakenError();
      }

      return tx.appointment.create({
        data: {
          businessId,
          serviceId,
          clientName,
          clientPhone,
          startAt: start,
          endAt: end,
          status: "pending",
        },
      });
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json(
        { error: "El horario solicitado ya no está disponible" },
        { status: 409 }
      );
    }
    throw err;
  }
}

class SlotTakenError extends Error {}
