import { prisma } from "../../../lib/db";
import { auth } from "../../../lib/auth";

// Sin funciones dinámicas (cookies/headers/searchParams), Next.js prerenderizaría
// esta página como estática en el build y serviría una foto fija de las citas;
// se fuerza render dinámico para que siempre muestre el estado real de la agenda.
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  // El middleware ya exige sesión para llegar aquí; businessId sale del token,
  // nunca de un parámetro que pudiera manipular el cliente.
  const session = await auth();
  const businessId = session!.user.businessId;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { name: true },
  });

  const appointments = await prisma.appointment.findMany({
    where: { businessId },
    include: { service: true },
    orderBy: { startAt: "asc" },
  });

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
  };
  const statusBadge: Record<string, string> = {
    pending: "badge-pending",
    confirmed: "badge-confirmed",
    cancelled: "badge-cancelled",
  };

  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Agenda — {business?.name}
        </h1>
      </header>

      {appointments.length === 0 ? (
        <p className="rounded-2xl bg-mist px-4 py-3 text-ink-soft">Todavía no hay citas reservadas.</p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Servicio</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>
                    {appt.startAt.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td>{appt.service.name}</td>
                  <td>{appt.clientName}</td>
                  <td>{appt.clientPhone}</td>
                  <td>
                    <span className={statusBadge[appt.status]}>{statusLabel[appt.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
