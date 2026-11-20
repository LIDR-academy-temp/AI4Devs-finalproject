import { prisma } from "../../../lib/db";
import { auth } from "../../../lib/auth";
import { AvailabilityManager } from "./AvailabilityManager";

export const dynamic = "force-dynamic";

export default async function DisponibilidadPage() {
  const session = await auth();
  const businessId = session!.user.businessId;

  const blocks = await prisma.availability.findMany({
    where: { businessId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Disponibilidad</h1>
        <p className="text-ink-soft">
          Los huecos reservables en la página pública se calculan a partir de estos bloques.
        </p>
      </header>
      <AvailabilityManager businessId={businessId} blocks={blocks} />
    </main>
  );
}
