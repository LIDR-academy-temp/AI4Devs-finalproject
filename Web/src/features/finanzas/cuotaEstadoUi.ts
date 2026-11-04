export function cuotaEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'Pagada':
      return 'bg-success-light text-success border border-success/25'
    case 'Pendiente':
      return 'bg-warning-light text-warning border border-warning/25'
    case 'Vencida':
      return 'bg-danger-light text-danger border border-danger/25'
    default:
      return 'bg-neutral-100 text-neutral-700 border border-neutral-200'
  }
}
