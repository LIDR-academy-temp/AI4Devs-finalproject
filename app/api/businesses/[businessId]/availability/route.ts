import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/db";
import { requireOwnBusiness } from "../../../../../lib/security/authz";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const createAvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timePattern, "startTime debe tener formato HH:mm"),
    endTime: z.string().regex(timePattern, "endTime debe tener formato HH:mm"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime debe ser posterior a startTime",
    path: ["endTime"],
  });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const availability = await prisma.availability.findMany({
    where: { businessId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(availability);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => null);
  const parsed = createAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const block = await prisma.availability.create({
    data: { businessId, ...parsed.data },
  });
  return NextResponse.json(block, { status: 201 });
}
