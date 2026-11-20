import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { requireOwnBusiness } from "../../../../../../lib/security/authz";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ businessId: string; availabilityId: string }> }
) {
  const { businessId, availabilityId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const existing = await prisma.availability.findFirst({
    where: { id: availabilityId, businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bloque no encontrado" }, { status: 404 });
  }

  await prisma.availability.delete({ where: { id: availabilityId } });
  return new NextResponse(null, { status: 204 });
}
