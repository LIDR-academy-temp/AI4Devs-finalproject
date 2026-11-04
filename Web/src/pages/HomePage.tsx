import { TicketCheck, Wallet, PlusCircle, FileText, Megaphone, CalendarDays } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { ResumenAdminCards } from '../features/dashboard/ResumenAdminCards'
import { ResumenResidenteCards } from '../features/dashboard/ResumenResidenteCards'
import { useDashboardResumen } from '../features/dashboard/useDashboardResumen'
import { PortalPageLayout, PortalSection } from '../shared/components/admin'
import { OnboardingWelcome } from '../shared/components/OnboardingWelcome'
import { QuickAccessCard } from '../shared/components/QuickAccessCard'
import { SkeletonCard } from '../shared/components/SkeletonCard'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const QUICK_ACCESS_RESIDENTE = [
  { to: '/tickets/nuevo', icon: PlusCircle, label: 'Nuevo ticket' },
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
  useQueryErrorToast(error)

  const isAdmin = session?.perfil === 'Administrador'
  const greeting = getGreeting()
  const nombre = session?.nombre ?? 'usuario'
  const quickAccess = isAdmin ? QUICK_ACCESS_ADMIN : QUICK_ACCESS_RESIDENTE

  return (
    <PortalPageLayout width="5xl" className="flex flex-col gap-6">
      <OnboardingWelcome />

      <header className="cq-portal-home-welcome">
        <h1>
          {greeting}, {nombre.split(' ')[0]} 👋
        </h1>
        <p>
          {session?.perfil} · Portal CuartaQuinientos
        </p>
      </header>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && (
        <button
          type="button"
          className="cq-portal-btn self-start"
          onClick={() => void refetch()}
        >
          Reintentar carga del resumen
        </button>
      )}

      {!loading && !error && data?.tipo === 'ADMIN' && <ResumenAdminCards data={data} />}
      {!loading && !error && data?.tipo === 'RESIDENTE' && <ResumenResidenteCards data={data} />}

      {!loading && (
        <PortalSection variant="padded" title="Accesos rápidos">
          <div className="cq-portal-quick-grid">
            {quickAccess.map((item) => (
              <QuickAccessCard key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
          </div>
        </PortalSection>
      )}
    </PortalPageLayout>
  )
}
