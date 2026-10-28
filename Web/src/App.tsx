import { Route, Routes } from 'react-router-dom'
import { PrivateRoute } from './shared/components/PrivateRoute'
import { NavMenuGuard } from './shared/components/NavMenuGuard'
import { HomePage } from './pages/HomePage'
import { NuevoTicketPage } from './pages/NuevoTicketPage'
import { TicketsPage } from './pages/TicketsPage'
import { LoginPage } from './pages/LoginPage'
import { CambiarPasswordPage } from './pages/CambiarPasswordPage'
import { RequireSessionRoute } from './shared/components/RequireSessionRoute'
import { AdminRoute } from './shared/components/AdminRoute'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { AdminTicketsPage } from './pages/AdminTicketsPage'
import { FinanzasAdminPage } from './pages/FinanzasAdminPage'
import { PerfilPage } from './pages/PerfilPage'
import { EstadoCuentaPage } from './pages/EstadoCuentaPage'
import { AdminUsuariosPage } from './pages/AdminUsuariosPage'
import { AdminCasasPage } from './pages/AdminCasasPage'
import { AnunciosPage } from './pages/AnunciosPage'
import { AnuncioDetallePage } from './pages/AnuncioDetallePage'
import { AdminAnunciosPage } from './pages/AdminAnunciosPage'
import { EncuestasPage } from './pages/EncuestasPage'
import { EncuestaDetallePage } from './pages/EncuestaDetallePage'
import { AdminEncuestasPage } from './pages/AdminEncuestasPage'
import { AdminEncuestaDetallePage } from './pages/AdminEncuestaDetallePage'
import { ResultadosEncuestaPage } from './pages/ResultadosEncuestaPage'
import { ArchivosPage } from './pages/ArchivosPage'
import { AdminArchivosPage } from './pages/AdminArchivosPage'
import { AdminTiposArchivoPage } from './pages/AdminTiposArchivoPage'
import { JuntasPage } from './pages/JuntasPage'
import { JuntaDetallePage } from './pages/JuntaDetallePage'
import { AdminJuntasPage } from './pages/AdminJuntasPage'
import { AreasYReservacionesPage } from './pages/AreasYReservacionesPage'
import { AdminVisitasPage } from './pages/AdminVisitasPage'
import { MisVehiculosPage } from './pages/MisVehiculosPage'
import { AdminVehiculosPage } from './pages/AdminVehiculosPage'
import { MisMascotasPage } from './pages/MisMascotasPage'
import { AdminMascotasPage } from './pages/AdminMascotasPage'
import { AdminAlmacenPage } from './pages/AdminAlmacenPage'
import { AdminMenusPage } from './pages/AdminMenusPage'
import { AdminPerfilesPage } from './pages/AdminPerfilesPage'
import { AdminPerfilPermisosPage } from './pages/AdminPerfilPermisosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireSessionRoute />}>
        <Route path="/cambiar-password" element={<CambiarPasswordPage />} />
      </Route>
      <Route element={<PrivateRoute />}>
        <Route path="/403" element={<ForbiddenPage />} />
        <Route element={<NavMenuGuard />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/nuevo" element={<NuevoTicketPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/finanzas/cuenta" element={<EstadoCuentaPage />} />
          <Route path="/anuncios" element={<AnunciosPage />} />
          <Route path="/anuncios/:id" element={<AnuncioDetallePage />} />
          <Route path="/encuestas" element={<EncuestasPage />} />
          <Route path="/encuestas/:id" element={<EncuestaDetallePage />} />
          <Route path="/archivos" element={<ArchivosPage />} />
          <Route path="/juntas" element={<JuntasPage />} />
          <Route path="/juntas/:id" element={<JuntaDetallePage />} />
          <Route path="/areas-comunes" element={<AreasYReservacionesPage />} />
          <Route path="/mis-vehiculos" element={<MisVehiculosPage />} />
          <Route path="/mis-mascotas" element={<MisMascotasPage />} />
        </Route>
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="/403" element={<ForbiddenPage />} />
        <Route element={<NavMenuGuard />}>
          <Route path="/admin/tickets" element={<AdminTicketsPage />} />
          <Route path="/admin/finanzas" element={<FinanzasAdminPage />} />
          <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
          <Route path="/admin/casas" element={<AdminCasasPage />} />
          <Route path="/admin/anuncios" element={<AdminAnunciosPage />} />
          <Route path="/admin/encuestas" element={<AdminEncuestasPage />} />
          <Route path="/admin/encuestas/:id/resultados" element={<ResultadosEncuestaPage />} />
          <Route path="/admin/encuestas/:id" element={<AdminEncuestaDetallePage />} />
          <Route path="/admin/archivos/tipos" element={<AdminTiposArchivoPage />} />
          <Route path="/admin/archivos" element={<AdminArchivosPage />} />
          <Route path="/admin/juntas" element={<AdminJuntasPage />} />
          <Route path="/admin/visitas" element={<AdminVisitasPage />} />
          <Route path="/admin/vehiculos" element={<AdminVehiculosPage />} />
          <Route path="/admin/mascotas" element={<AdminMascotasPage />} />
          <Route path="/admin/almacen" element={<AdminAlmacenPage />} />
          <Route path="/admin/menus" element={<AdminMenusPage />} />
          <Route path="/admin/perfiles" element={<AdminPerfilesPage />} />
          <Route path="/admin/perfiles/:id/permisos" element={<AdminPerfilPermisosPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
