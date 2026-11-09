interface SkeletonCardProps {
  height?: string
  className?: string
}

export function SkeletonCard({ height = 'h-28', className = '' }: SkeletonCardProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando contenido"
      className={`animate-pulse rounded-xl bg-neutral-200 ${height} ${className}`}
    />
  )
}
