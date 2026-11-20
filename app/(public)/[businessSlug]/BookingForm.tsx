"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
}

interface Props {
  businessId: string;
  services: Service[];
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

const STEPS = ["Servicio", "Fecha", "Hora", "Tus datos"];

function StepRail({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = step < current ? "done" : step === current ? "active" : "pending";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                (state === "done"
                  ? "bg-violet text-paper"
                  : state === "active"
                    ? "bg-sun text-ink"
                    : "bg-mist text-ink-soft")
              }
            >
              {step}
            </span>
            <span
              className={
                "hidden text-sm font-medium sm:inline " +
                (state === "pending" ? "text-ink-soft" : "text-ink")
              }
            >
              {label}
            </span>
            {step < STEPS.length && <span className="h-px w-4 bg-mist-line sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function BookingForm({ businessId, services }: Props) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "booking" | "confirmed" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (serviceId) loadSlots(serviceId, date);
    // Solo se ejecuta al montar: los cambios de servicio/fecha disparan su propio fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSlots(nextServiceId: string, nextDate: string) {
    setStatus("loading");
    setErrorMessage(null);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/businesses/${businessId}/slots?serviceId=${nextServiceId}&date=${nextDate}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar la disponibilidad");
      setSlots(data.slots ?? []);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado");
      setStatus("error");
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setStatus("booking");
    setErrorMessage(null);
    try {
      const startAt = `${date}T${selectedSlot}:00`;
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, serviceId, startAt, clientName, clientPhone }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setErrorMessage("Ese horario ya no está disponible, elige otro.");
        setStatus("idle");
        await loadSlots(serviceId, date);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la reserva");
      setStatus("confirmed");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado");
      setStatus("error");
    }
  }

  if (status === "confirmed") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-violet/15 bg-mist p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun text-lg font-bold text-ink">
          ✓
        </span>
        <p className="font-display text-xl font-semibold text-ink">¡Listo, {clientName}!</p>
        <p className="text-ink-soft">
          Tu cita quedó reservada para el <strong className="text-ink">{date}</strong> a las{" "}
          <strong className="text-ink">{selectedSlot}</strong>. Te llega un recordatorio por
          WhatsApp 24 horas antes.
        </p>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleBook}>
      <StepRail current={selectedSlot ? 4 : 3} />

      <label className="field-label">
        Servicio
        <select
          className="field-input"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            loadSlots(e.target.value, date);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMinutes} min · ${s.price})
            </option>
          ))}
        </select>
      </label>

      <label className="field-label">
        Fecha
        <input
          type="date"
          className="field-input"
          value={date}
          min={todayISODate()}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(serviceId, e.target.value);
          }}
        />
      </label>

      <div className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-ink">Horarios disponibles</span>
        {status === "loading" && <p className="text-ink-soft">Cargando...</p>}
        {status !== "loading" && slots.length === 0 && (
          <p className="text-ink-soft">No hay horarios libres ese día.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={selectedSlot === slot ? "slot-pill slot-pill-selected" : "slot-pill"}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <>
          <label className="field-label">
            Nombre
            <input
              required
              className="field-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </label>
          <label className="field-label">
            Teléfono (WhatsApp)
            <input
              required
              className="field-input"
              placeholder="+51987654321"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </label>
        </>
      )}

      {errorMessage && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral-dark">
          {errorMessage}
        </p>
      )}

      <button type="submit" disabled={!selectedSlot || status === "booking"} className="btn-primary">
        {status === "booking" ? "Reservando..." : "Reservar cita"}
      </button>
    </form>
  );
}
