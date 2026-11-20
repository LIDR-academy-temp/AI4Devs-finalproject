"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AvailabilityBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function AvailabilityManager({
  businessId,
  blocks,
}: {
  businessId: string;
  blocks: AvailabilityBlock[];
}) {
  const router = useRouter();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/businesses/${businessId}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startTime, endTime }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.formErrors?.[0] ?? data?.error ?? "No se pudo crear el bloque");
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/businesses/${businessId}/availability/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-mist p-4"
      >
        <label className="field-label">
          Día
          <select
            className="field-input"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
          >
            {DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Desde
          <input
            type="time"
            required
            className="field-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
        <label className="field-label">
          Hasta
          <input
            type="time"
            required
            className="field-input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Agregando..." : "Agregar bloque"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral-dark">
          {error}
        </p>
      )}

      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <table className="panel-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.id}>
                <td>{DAY_LABELS[b.dayOfWeek]}</td>
                <td>{b.startTime}</td>
                <td>{b.endTime}</td>
                <td>
                  <button className="btn-ghost px-0" onClick={() => handleDelete(b.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
