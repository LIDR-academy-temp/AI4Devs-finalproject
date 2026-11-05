import { Link, Navigate, Outlet, Route, Routes } from 'react-router'
import { AvisoDeModo } from './componentes/AvisoDeModo'
import { SelectorEstacion } from './componentes/SelectorEstacion'
import { Acceso } from './pantallas/Acceso'
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

function Protegida() {
  const { estado, salir } = useSesion()

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
          <Route path="/estaciones/:estacionId" element={<Decision />} />
          <Route path="/estaciones/:estacionId/sensores/:sensorId" element={<DetalleSensor />} />
          <Route path="*" element={<p role="status">Esta página no existe.</p>} />
        </Route>
      </Routes>
    </>
  )
}

export default App
