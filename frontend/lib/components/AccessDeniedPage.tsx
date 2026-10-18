export interface AccessDeniedPageProps {
  /** Custom message (defaults to generic forbidden message) */
  message?: string;
}

export function AccessDeniedPage({ message }: AccessDeniedPageProps) {
  const displayMessage =
    message || "No tienes permiso para acceder a esta sección. Contacta al administrador si crees que es un error.";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso denegado</h1>
        <p className="text-gray-600 mb-8">{displayMessage}</p>
        <a
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
