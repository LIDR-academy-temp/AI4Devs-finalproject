"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import { SessionExpiredPage } from "@/lib/components/SessionExpiredPage";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();

  if (session.status === "loading") {
    return <div role="status">Cargando…</div>;
  }

  if (session.status === "session_expired") {
    return <SessionExpiredPage />;
  }

  if (session.status === "unauthenticated") {
    // Should not happen in authenticated routes (handled by guards), but be safe
    return <div>Por favor, inicia sesión para continuar.</div>;
  }

  return <>{children}</>;
}
