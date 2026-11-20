import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/db";
import { computeAvailableSlots } from "../../../../../lib/services/slots";
import { checkRateLimit, clientIp } from "../../../../../lib/security/rateLimit";

const querySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const rateLimit = checkRateLimit(`slots:${clientIp(request)}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, intenta de nuevo en un momento" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const { businessId } = await params;
  const parsed = querySchema.safeParse({
    serviceId: request.nextUrl.searchParams.get("serviceId"),
    date: request.nextUrl.searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { serviceId, date } = parsed.data;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found for this business" }, { status: 404 });
  }

  const day = new Date(`${date}T00:00:00`);
  const dayOfWeek = day.getDay();

  const availability = await prisma.availability.findMany({
    where: { businessId, dayOfWeek },
  });

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { not: "cancelled" },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    select: { startAt: true, endAt: true },
  });

  const slots = computeAvailableSlots({
    date: day,
    availability: availability.map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
    durationMinutes: service.durationMinutes,
    existingAppointments,
    now: new Date(),
  });

  return NextResponse.json({ date, serviceId, slots });
}
