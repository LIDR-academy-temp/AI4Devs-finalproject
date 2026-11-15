import { VERSION_TERMINOS } from '../servicios/formularios'

export function AvisoBorrador() {
  return (
    <p role="note" className="aviso">
      Versión {VERSION_TERMINOS}. Borrador pendiente de revisión legal.
    </p>
  )
}
