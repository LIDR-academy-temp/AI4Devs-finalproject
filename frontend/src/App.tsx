import { Link, Navigate, Outlet, Route, Routes } from 'react-router'
import { AvisoDeModo } from './componentes/AvisoDeModo'
import { SelectorEstacion } from './componentes/SelectorEstacion'
import { Acceso } from './pantallas/Acceso'
import { Administracion } from './pantallas/Administracion'
import { Baja } from './pantallas/Baja'
import { Confirmar } from './pantallas/Confirmar'
import { Decision } from './pantallas/Decision'
import { DetalleSensor } from './pantallas/DetalleSensor'
import { Estaciones } from './pantallas/Estaciones'
import { MiCuenta } from './pantallas/MiCuenta'
import { Privacidad } from './pantallas/Privacidad'
import { Recuperar } from './pantallas/Recuperar'
import { ReenviarConfirmacion } from './pantallas/ReenviarConfirmacion'
import { Registro } from './pantallas/Registro'
import { Restablecer } from './pantallas/Restablecer'
import { Terminos } from './pantallas/Terminos'
import { ProveedorDeEstaciones } from './servicios/estaciones'
import { useSesion } from './servicios/sesion'

const PAGINA_INEXISTENTE = <p role="status">Esta página no existe.</p>

/** Para cualquier cuenta sin el rol, la pantalla no existe, igual que en la API. */
function SoloAdministrador() {
  const { esAdministrador } = useSesion()
  if (esAdministrador === null) {
    return <p role="status">Verificando la sesión…</p>
  }
  return esAdministrador ? <Administracion /> : PAGINA_INEXISTENTE
}

function Protegida() {
  const { estado, salir, esAdministrador } = useSesion()

  if (estado === 'verificando') {
    return <p role="status">Verificando la sesión…</p>
  }
  if (estado === 'sin_sesion') {
    return <Navigate to="/acceso" replace />
  }
  return (
    <ProveedorDeEstaciones>
      <header className="encabezado">
        <Link to="/" className="marca">
          Weather Track
        </Link>
        <SelectorEstacion />
        {esAdministrador && (
          <Link to="/administracion" className="enlace-cuenta">
            Administración
          </Link>
        )}
        <Link to="/cuenta" className="enlace-cuenta">
          Mi cuenta
        </Link>
        <button type="button" className="secundario-boton" onClick={() => void salir()}>
          Salir
        </button>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </ProveedorDeEstaciones>
  )
}

function App() {
  return (
    <>
      <AvisoDeModo />
      <Routes>
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/confirmar" element={<Confirmar />} />
        <Route path="/reenviar-confirmacion" element={<ReenviarConfirmacion />} />
        <Route path="/recuperar" element={<Recuperar />} />
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/baja" element={<Baja />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route element={<Protegida />}>
          <Route path="/" element={<Estaciones />} />
          <Route path="/cuenta" element={<MiCuenta />} />
          <Route path="/administracion" element={<SoloAdministrador />} />
          <Route path="/estaciones/:estacionId" element={<Decision />} />
          <Route path="/estaciones/:estacionId/sensores/:sensorId" element={<DetalleSensor />} />
          <Route path="*" element={PAGINA_INEXISTENTE} />
        </Route>
      </Routes>
    </>
  )
}

export default App
