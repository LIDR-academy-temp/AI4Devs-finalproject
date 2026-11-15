import { Link } from 'react-router'
import { AvisoBorrador } from '../componentes/AvisoBorrador'
import { PaginaPublica } from '../componentes/PaginaPublica'

export function Privacidad() {
  return (
    <PaginaPublica titulo="Política de privacidad" amplia>
      <AvisoBorrador />
      <section className="texto-legal">
        <h2>Qué datos guardamos</h2>
        <p>
          Nombre y apellido, correo, localidad y provincia; y, si los indica, organización o establecimiento
          y teléfono. También la fecha en que aceptó estos términos y si quiere recibir novedades. La
          contraseña se guarda solo como un resumen cifrado que no permite recuperarla.
        </p>
        <h2>Para qué los usamos</h2>
        <p>
          Para darle acceso a Weather Track, enviarle los correos de su cuenta y contactarlo por el
          servicio. Las novedades solo se envían si las aceptó, y puede dejar de recibirlas desde «Mi
          cuenta».
        </p>
        <h2>Sus derechos</h2>
        <p>
          Puede consultar y corregir sus datos en <Link to="/cuenta">Mi cuenta</Link>, y borrarlos en
          cualquier momento dándose de baja desde allí o desde el enlace que trae cada correo. La baja borra
          la cuenta y todos sus datos. Estos derechos de acceso, rectificación y supresión están previstos
          en la Ley 25.326 de Protección de los Datos Personales.
        </p>
        <h2>Cuentas sin confirmar</h2>
        <p>
          Si no confirma su correo dentro de las 48 horas, la cuenta y sus datos se borran.
        </p>
        <h2>Datos meteorológicos</h2>
        <p>
          Las lecturas de las estaciones las provee Weather Track a partir de su propio acceso al sistema
          SAT2. Su cuenta no tiene relación con ese acceso.
        </p>
      </section>
      <p>
        <Link to="/terminos">Términos de uso</Link> · <Link to="/registro">Crear una cuenta</Link>
      </p>
    </PaginaPublica>
  )
}
