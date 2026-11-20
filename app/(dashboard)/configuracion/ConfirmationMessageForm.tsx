"use client";

import { useState } from "react";

const PLACEHOLDERS = ["{{clientName}}", "{{service}}", "{{date}}", "{{time}}", "{{business}}"];

export function ConfirmationMessageForm({
  businessId,
  initialTemplate,
}: {
  businessId: string;
  initialTemplate: string;
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationMessageTemplate: template }),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <label className="field-label">
        Mensaje de confirmación por WhatsApp
        <textarea
          required
          rows={4}
          maxLength={500}
          className="field-input resize-none"
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value);
            setStatus("idle");
          }}
        />
      </label>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink-soft">
          Placeholders disponibles (se usarán cuando el recordatorio automático de 24h esté
          activo, en la Entrega Final):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <span key={p} className="rounded-full bg-mist px-2.5 py-1 text-xs font-medium text-violet-dark">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === "saving"} className="btn-primary">
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
        {status === "saved" && <span className="text-sm font-medium text-violet-dark">Guardado.</span>}
        {status === "error" && (
          <span className="text-sm font-medium text-coral-dark">No se pudo guardar.</span>
        )}
      </div>
    </form>
  );
}
