import { TicketCheck, Wallet, PlusCircle, FileText, Megaphone, CalendarDays } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { ResumenAdminCards } from '../features/dashboard/ResumenAdminCards'
import { ResumenResidenteCards } from '../features/dashboard/ResumenResidenteCards'
import { useDashboardResumen } from '../features/dashboard/useDashboardResumen'
import { QuickAccessCard } from '../shared/components/QuickAccessCard'
import { SkeletonCard } from '../shared/components/SkeletonCard'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const QUICK_ACCESS_RESIDENTE = [
  { to: '/tickets', icon: PlusCircle, label: 'Nuevo ticket' },
  { to: '/finanzas/cuenta', icon: Wallet, label: 'Ver estado de cuenta' },
  { to: '/anuncios', icon: Megaphone, label: 'Anuncios' },
  { to: '/juntas', icon: CalendarDays, label: 'Juntas' },
]

const QUICK_ACCESS_ADMIN = [
  { to: '/admin/tickets', icon: TicketCheck, label: 'Gestionar tickets' },
  { to: '/admin/usuarios', icon: FileText, label: 'Residentes' },
  { to: '/admin/finanzas', icon: Wallet, label: 'Finanzas' },
  { to: '/admin/anuncios', icon: Megaphone, label: 'Anuncios' },
]

export function HomePage() {
  const { session } = useAuth()
  const { data, loading, error, refetch } = useDashboardResumen()

  const isAdmin = session?.perfil === 'Administrador'
  const greeting = getGreeting()
  const nombre = session?.nombre ?? 'usuario'
  const quickAccess = isAdmin ? QUICK_ACCESS_ADMIN : QUICK_ACCESS_RESIDENTE

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">
      {/* Saludo personalizado */}
      <div>
        <h1 className="text-2xl font-semibold text-primary-dark">
          {greeting}, {nombre.split(' ')[0]} 👋
        </h1>
        <p className="mt-0.5 text-sm text-neutral">
          {session?.perfil} · Portal CuartaQuinientos
        </p>
      </div>

      {/* Cards de resumen */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            className="cursor-pointer rounded border px-3 py-1 text-sm hover:bg-white"
            onClick={() => void refetch()}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data?.tipo === 'ADMIN' && <ResumenAdminCards data={data} />}
      {!loading && !error && data?.tipo === 'RESIDENTE' && <ResumenResidenteCards data={data} />}

      {/* Accesos rápidos */}
      {!loading && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral">
            Accesos rápidos
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickAccess.map((item) => (
              <QuickAccessCard key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
