import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/api/client';

interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
    retry: false,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Concilia</h1>
      <p className="text-center text-muted-foreground">
        Conciliación automática de ventas con tarjeta contra el extracto bancario.
      </p>
      <section className="w-full rounded-lg border bg-card p-4 text-sm">
        <h2 className="mb-2 font-medium">Estado de la API</h2>
        {health.isPending && <p className="text-muted-foreground">Comprobando…</p>}
        {health.isError && (
          <p className="text-destructive">
            No se pudo contactar con la API: {health.error.message}
          </p>
        )}
        {health.data && (
          <dl className="grid grid-cols-2 gap-1">
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{health.data.status}</dd>
            <dt className="text-muted-foreground">Base de datos</dt>
            <dd>{health.data.database}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
