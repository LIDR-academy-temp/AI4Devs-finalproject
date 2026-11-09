import { TRANSICIONES_PERMITIDAS } from '../admin/tickets/ticketTransitions'

/** Etiquetas admin (EST-2) — catálogo sin cambiar en BD. */
const ESTADO_LABEL_ADMIN: Record<string, string> = {
  Nuevo: 'Abierto',
  'En seguimiento': 'En trabajo',
  Resuelto: 'Resuelto',
  Cerrado: 'Cerrado',
}

export function displayEstadoAdmin(catalogoNombre: string): { label: string; title: string } {
  const title = catalogoNombre
  const label = ESTADO_LABEL_ADMIN[catalogoNombre] ?? catalogoNombre
  return { label, title }
}

export function displayTransicionAdmin(destinoCatalogo: string): { label: string; title: string } {
  return {
    label: `→ ${displayEstadoAdmin(destinoCatalogo).label}`,
    title: destinoCatalogo,
  }
}

export { TRANSICIONES_PERMITIDAS as transicionesEstadoTicket }
