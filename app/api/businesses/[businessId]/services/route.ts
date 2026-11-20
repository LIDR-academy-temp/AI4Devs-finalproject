import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/db";
import { requireOwnBusiness } from "../../../../../lib/security/authz";

const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => null);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: { businessId, ...parsed.data },
  });
  return NextResponse.json(service, { status: 201 });
}
