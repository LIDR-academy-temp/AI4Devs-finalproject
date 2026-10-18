export interface AccessDeniedPageProps {
  /** Custom message (defaults to generic forbidden message) */
  message?: string;
}

export function AccessDeniedPage({ message }: AccessDeniedPageProps) {
  const displayMessage =
    message || "No tienes permiso para acceder a esta sección. Contacta al administrador si crees que es un error.";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <div style={{ width: "100%", maxWidth: "28rem", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Acceso denegado</h1>
        <p style={{ color: "#4b5563", marginBottom: "2rem" }}>{displayMessage}</p>
        <a
          href="/"
          style={{ display: "inline-block", padding: "0.5rem 1.5rem", backgroundColor: "#2563eb", color: "white", fontWeight: "600", borderRadius: "0.375rem", textDecoration: "none" }}
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
