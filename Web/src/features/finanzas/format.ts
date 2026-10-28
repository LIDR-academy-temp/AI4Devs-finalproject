const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function formatMxn(value: number): string {
  return mxn.format(value)
}

export function formatPeriodo(inicio: string): string {
  const d = new Date(inicio)
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(d)
}

export function formatFecha(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(d)
}
