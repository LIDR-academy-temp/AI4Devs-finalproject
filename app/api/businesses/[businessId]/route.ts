import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/db";
import { requireOwnBusiness } from "../../../../lib/security/authz";

const updateBusinessSchema = z.object({
  confirmationMessageTemplate: z.string().trim().min(1).max(500),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const authz = await requireOwnBusiness(businessId);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => null);
  const parsed = updateBusinessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: parsed.data,
    select: { id: true, name: true, confirmationMessageTemplate: true },
  });
  return NextResponse.json(business);
}
