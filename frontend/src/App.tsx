import { useEffect, useState } from 'react'

type EstadoApi = 'consultando' | 'disponible' | 'sin conexión'

function App() {
  const [estadoApi, setEstadoApi] = useState<EstadoApi>('consultando')

  useEffect(() => {
    fetch('/api/v1/salud')
      .then((respuesta) =>
        setEstadoApi(respuesta.ok ? 'disponible' : 'sin conexión'),
      )
      .catch(() => setEstadoApi('sin conexión'))
  }, [])

  return (
    <main>
      <h1>Weather Track</h1>
      <p>API: {estadoApi}</p>
    </main>
  )
}

export default App
