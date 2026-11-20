import { notFound } from "next/navigation";
import { prisma } from "../../../lib/db";
import { BookingForm } from "./BookingForm";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  // select explícito: nunca traer passwordHash hacia una página que pasa
  // datos del negocio a un componente cliente (BookingForm).
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      id: true,
      name: true,
      services: {
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, durationMinutes: true, price: true },
      },
    },
  });

  if (!business) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-ink">{business.name}</h1>
        <p className="text-ink-soft">Elige servicio, día y hora — tu cita queda lista al instante.</p>
      </header>

      {business.services.length === 0 ? (
        <p className="rounded-2xl bg-mist px-4 py-3 text-ink-soft">
          Este negocio todavía no tiene servicios disponibles para reservar.
        </p>
      ) : (
        <BookingForm businessId={business.id} services={business.services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price.toString(),
        }))} />
      )}
    </main>
  );
}
