import { useAuth } from "@/lib/auth/AuthContext";

export function SessionExpiredPage() {
  const { signIn } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Sesión caducada</h1>
        <p className="text-gray-600 mb-8">
          Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.
        </p>
        <button
          onClick={() => signIn("/")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
