import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

/** Layout autenticado: barra superior con el usuario y el cierre de sesión. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/reconciliations" className="text-lg font-semibold tracking-tight">
            Concilia
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {user?.name} · {user?.company.name}
            </span>
            <button type="button" onClick={onLogout} className="rounded-md border px-3 py-1.5">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
