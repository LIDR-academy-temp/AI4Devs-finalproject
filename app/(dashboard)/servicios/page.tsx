import { prisma } from "../../../lib/db";
import { auth } from "../../../lib/auth";
import { ServiceManager } from "./ServiceManager";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const session = await auth();
  const businessId = session!.user.businessId;

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  });

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink">Servicios</h1>
        <p className="text-ink-soft">
          Los clientes solo pueden reservar servicios activos en la página pública.
        </p>
      </header>
      <ServiceManager
        businessId={businessId}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price.toString(),
          active: s.active,
        }))}
      />
    </main>
  );
}
