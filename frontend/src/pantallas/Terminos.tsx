import { Link } from 'react-router'
import { AvisoBorrador } from '../componentes/AvisoBorrador'
import { PaginaPublica } from '../componentes/PaginaPublica'

export function Terminos() {
  return (
    <PaginaPublica titulo="Términos de uso" amplia>
      <AvisoBorrador />
      <section className="texto-legal">
        <h2>El servicio</h2>
        <p>
          Weather Track muestra las condiciones de las estaciones meteorológicas y una recomendación sobre
          si conviene aplicar fitosanitarios en ese momento, según el riesgo de deriva.
        </p>
        <h2>La recomendación es orientativa</h2>
        <p>
          No reemplaza el criterio profesional ni las indicaciones de la etiqueta del producto. Los pesos y
          umbrales del índice todavía no tienen validación agronómica. La decisión de aplicar es de quien
          aplica.
        </p>
        <h2>Los datos pueden faltar o atrasarse</h2>
        <p>
          Las lecturas dependen de las estaciones y de la fuente SAT2. Cuando faltan datos, están viejos o
          son dudosos, la aplicación lo indica y no muestra una recomendación como vigente.
        </p>
        <h2>Su cuenta</h2>
        <p>
          Es personal. Cuide su contraseña: si cree que otra persona la conoce, cámbiela desde «Mi
          cuenta». Puede darse de baja cuando quiera.
        </p>
      </section>
      <p>
        <Link to="/privacidad">Política de privacidad</Link> · <Link to="/registro">Crear una cuenta</Link>
      </p>
    </PaginaPublica>
  )
}
