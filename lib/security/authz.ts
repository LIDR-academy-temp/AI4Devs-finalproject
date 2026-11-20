import { NextResponse } from "next/server";
import { auth } from "../auth";

// Multi-tenancy: todo endpoint del panel del negocio pasa por aquí para
// verificar que el businessId de la URL coincide con el de la sesión, nunca
// confiando en el valor recibido del cliente (ver CLAUDE.md § Conventions).
export async function requireOwnBusiness(businessId: string) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) } as const;
  }
  if (session.user.businessId !== businessId) {
    return { error: NextResponse.json({ error: "No autorizado para este negocio" }, { status: 403 }) } as const;
  }
  return { session } as const;
}
