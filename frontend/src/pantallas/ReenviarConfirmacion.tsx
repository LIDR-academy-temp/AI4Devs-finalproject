import { Link } from 'react-router'
import { PaginaPublica } from '../componentes/PaginaPublica'
import { ReenvioConfirmacion } from '../componentes/ReenvioConfirmacion'

export function ReenviarConfirmacion() {
  return (
    <PaginaPublica titulo="Confirmar la cuenta">
      <p className="secundario">
        Si su cuenta todavía no está confirmada, le enviamos un enlace nuevo, válido por 48 horas.
      </p>
      <ReenvioConfirmacion />
      <p>
        <Link to="/acceso">Volver al ingreso</Link>
      </p>
    </PaginaPublica>
  )
}
