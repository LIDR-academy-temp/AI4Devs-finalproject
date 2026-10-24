import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

/** Placeholder del listado de conciliaciones hasta el change `reconciliation-management`. */
export function ReconciliationsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conciliaciones</h1>
          <p className="text-sm text-muted-foreground">
            {user?.name} · {user?.company.name}
          </p>
        </div>
        <button type="button" onClick={onLogout} className="rounded-md border px-3 py-1.5 text-sm">
          Cerrar sesión
        </button>
      </header>
      <p className="text-muted-foreground">Aún no hay conciliaciones.</p>
    </main>
  );
}
