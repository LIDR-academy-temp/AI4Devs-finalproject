import Link from "next/link";

const PREVIEW_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16 px-6 py-20 lg:flex-row lg:items-center lg:gap-12 lg:py-0">
      <div className="flex max-w-xl flex-col gap-7">
        <h1 className="font-display text-4xl leading-[1.05] font-semibold text-ink sm:text-5xl">
          Reserva tu cita en lo que tardas en escribir un WhatsApp.
        </h1>
        <p className="max-w-md text-lg text-ink-soft">
          AgendaYa le da a tu negocio una agenda pública: tus clientes eligen servicio,
          día y hora libres, y tú recibes la cita confirmada al instante — sin llamadas,
          sin ida y vuelta de mensajes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/barberia-demo" className="btn-primary">
            Probar una reserva
          </Link>
          <Link href="/login" className="btn-secondary">
            Soy dueño de un negocio
          </Link>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-sm shrink-0 lg:mx-0">
        <div
          aria-hidden
          className="absolute -right-4 -bottom-4 h-full w-full rounded-3xl bg-sun"
        />
        <div className="relative flex flex-col gap-4 rounded-3xl border-2 border-ink/5 bg-paper p-6 shadow-[0_24px_60px_-28px_rgba(23,18,31,0.35)]">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Barbería AgendaYa</p>
            <p className="text-sm text-ink-soft">Corte de cabello · 30 min</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PREVIEW_SLOTS.map((slot, i) => (
              <span
                key={slot}
                className={i === 2 ? "slot-pill slot-pill-selected" : "slot-pill"}
              >
                {slot}
              </span>
            ))}
          </div>
          <p className="rounded-xl bg-violet/10 px-3 py-2 text-sm font-medium text-violet-dark">
            10:00 reservado — te llega el recordatorio 24h antes por WhatsApp.
          </p>
        </div>
      </div>
    </main>
  );
}
