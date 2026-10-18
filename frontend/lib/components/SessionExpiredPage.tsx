import { useAuth } from "@/lib/auth/AuthContext";

export function SessionExpiredPage() {
  const { signIn } = useAuth();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <div style={{ width: "100%", maxWidth: "28rem", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>Sesión caducada</h1>
        <p style={{ color: "#4b5563", marginBottom: "2rem" }}>
          Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.
        </p>
        <button
          onClick={() => signIn("/")}
          style={{ width: "100%", padding: "0.5rem 1rem", backgroundColor: "#2563eb", color: "white", fontWeight: "600", borderRadius: "0.375rem" }}
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
