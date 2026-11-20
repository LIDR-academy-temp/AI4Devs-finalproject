"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  active: boolean;
}

export function ServiceManager({ businessId, services }: { businessId: string; services: Service[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/businesses/${businessId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, durationMinutes, price }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ? JSON.stringify(data.error) : "No se pudo crear el servicio");
      return;
    }
    setName("");
    setDurationMinutes(30);
    setPrice(0);
    router.refresh();
  }

  async function toggleActive(service: Service) {
    await fetch(`/api/businesses/${businessId}/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-mist p-4"
      >
        <label className="field-label">
          Nombre
          <input
            required
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field-label">
          Duración (min)
          <input
            type="number"
            min={5}
            max={480}
            required
            className="field-input w-28"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </label>
        <label className="field-label">
          Precio
          <input
            type="number"
            min={0}
            step="0.01"
            required
            className="field-input w-28"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creando..." : "Agregar servicio"}
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
              <th>Nombre</th>
              <th>Duración</th>
              <th>Precio</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.durationMinutes} min</td>
                <td>${s.price}</td>
                <td>
                  <span className={s.active ? "badge-confirmed" : "badge-cancelled"}>
                    {s.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button className="btn-ghost px-0" onClick={() => toggleActive(s)}>
                    {s.active ? "Desactivar" : "Reactivar"}
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
