"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/agenda";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (!result || result.error) {
      setError("Email o contraseña incorrectos");
      setSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="field-label">
        Email
        <input
          type="email"
          required
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field-label">
        Contraseña
        <input
          type="password"
          required
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error && (
        <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral-dark">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
