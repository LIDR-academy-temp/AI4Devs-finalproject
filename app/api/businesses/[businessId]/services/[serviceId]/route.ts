import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../../lib/db";
import { requireOwnBusiness } from "../../../../../../lib/security/authz";

const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; serviceId: string }> }
) {
  const { businessId, serviceId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.service.findFirst({ where: { id: serviceId, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const service = await prisma.service.update({
    where: { id: serviceId },
    data: parsed.data,
  });
  return NextResponse.json(service);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; serviceId: string }> }
) {
  const { businessId, serviceId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const existing = await prisma.service.findFirst({ where: { id: serviceId, businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  // Desactivar, no borrar: un DELETE real arrastraría (cascade) las citas
  // históricas ligadas a este servicio.
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: { active: false },
  });
  return NextResponse.json(service);
}
