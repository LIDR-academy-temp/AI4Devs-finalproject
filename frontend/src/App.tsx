import { Link, Navigate, Outlet, Route, Routes } from 'react-router'
import { Acceso } from './pantallas/Acceso'
import { Decision } from './pantallas/Decision'
import { DetalleSensor } from './pantallas/DetalleSensor'
import { Estaciones } from './pantallas/Estaciones'
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
    <>
      <header className="encabezado">
        <Link to="/" className="marca">
          Weather Track
        </Link>
        <button type="button" className="secundario-boton" onClick={() => void salir()}>
          Salir
        </button>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/acceso" element={<Acceso />} />
      <Route element={<Protegida />}>
        <Route path="/" element={<Estaciones />} />
        <Route path="/estaciones/:estacionId" element={<Decision />} />
        <Route path="/estaciones/:estacionId/sensores/:sensorId" element={<DetalleSensor />} />
        <Route path="*" element={<p role="status">Esta página no existe.</p>} />
      </Route>
    </Routes>
  )
}

export default App
