import type { Recomendacion } from '../servicios/cliente'
import { formatearFechaHora, formatearNumero } from '../servicios/serie'

const PRESENTACION: Record<string, { texto: string; icono: string; clase: string }> = {
  APTO: { texto: 'Apto para aplicar', icono: '✓', clase: 'estado-apto' },
  PRECAUCION: { texto: 'Precaución', icono: '!', clase: 'estado-precaucion' },
  RIESGO_DERIVA: { texto: 'Riesgo de deriva', icono: '▲', clase: 'estado-riesgo' },
  NO_APLICAR: { texto: 'No aplicar', icono: '✕', clase: 'estado-no-aplicar' },
  DATOS_INSUFICIENTES: { texto: 'Datos insuficientes', icono: '?', clase: 'estado-neutro' },
}

interface Props {
  recomendacion: Recomendacion
  sinConexion: boolean
}

export function BloqueEstado({ recomendacion, sinConexion }: Props) {
  const conocido = PRESENTACION[recomendacion.estado] ?? PRESENTACION.DATOS_INSUFICIENTES
  // Sin conexión no se sabe si sigue vigente: mostrarlo como actual podría inducir a aplicar.
  const presentacion = sinConexion
    ? { texto: 'Sin conexión', icono: '?', clase: 'estado-neutro' }
    : conocido
  const mostrarDetalle = !sinConexion && recomendacion.estado !== 'DATOS_INSUFICIENTES'

  return (
    <section className={`bloque-estado ${presentacion.clase}`} aria-label="Recomendación de aplicación">
      <p className="estado-principal">
        <span className="estado-icono" aria-hidden="true">
          {presentacion.icono}
        </span>
        {presentacion.texto}
      </p>

      {sinConexion && (
        <p role="alert" className="estado-explicacion">
          No se pudo actualizar y el estado puede no estar vigente. Último estado conocido:{' '}
          {conocido.texto}
          {recomendacion.medido_en && `, medición del ${formatearFechaHora(recomendacion.medido_en)}`}.
        </p>
      )}

      {mostrarDetalle && (
        <dl className="estado-datos">
          <div>
            <dt>Índice TIS</dt>
            <dd>{formatearNumero(recomendacion.indice)}</dd>
          </div>
          <div>
            <dt>Diferencia térmica</dt>
            <dd>{formatearNumero(recomendacion.delta_t_c)} °C</dd>
          </div>
          {recomendacion.medido_en && (
            <div>
              <dt>Medición</dt>
              <dd>{formatearFechaHora(recomendacion.medido_en)}</dd>
            </div>
          )}
        </dl>
      )}

      {!sinConexion && (
        <ul className="motivos" aria-label="Motivos">
          {recomendacion.motivos.map((motivo) => (
            <li key={motivo.codigo}>{motivo.detalle}</li>
          ))}
        </ul>
      )}

      <p className="aviso-orientativo">
        {recomendacion.aviso} <span className="metodo">Método {recomendacion.version_metodo}.</span>
      </p>
    </section>
  )
}
