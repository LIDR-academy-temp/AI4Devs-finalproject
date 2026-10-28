import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiGet } from '../shared/lib/apiClient'
import type { EncuestaResultados } from '../shared/types/encuestas'

export type ResultadosEncuestaVariant = 'admin' | 'residente'

type Props = {
  variant?: ResultadosEncuestaVariant
}

function ResultadosPreguntas({
  resultados,
  variant,
}: {
  resultados: EncuestaResultados
  variant: ResultadosEncuestaVariant
}) {
  if (resultados.preguntas.length === 0) {
    return <p className={variant === 'admin' ? 'text-muted mt-4' : 'mt-4 text-sm text-neutral'}>No hay respuestas aún.</p>
  }

  const cardClass =
    variant === 'admin'
      ? 'card'
      : 'rounded-lg border border-neutral-200 bg-surface-alt shadow-sm'

  return (
    <div className={variant === 'admin' ? 'mt-4 space-y-4' : 'mt-6 flex flex-col gap-4'}>
      {resultados.preguntas.map((pregunta) => (
        <div key={pregunta.preguntaId} className={cardClass}>
          <div className={variant === 'admin' ? 'card-body' : 'p-4'}>
            <h2
              className={
                variant === 'admin'
                  ? 'h6 font-weight-bold mb-3'
                  : 'mb-3 text-base font-semibold text-neutral-900'
              }
            >
              {pregunta.texto}
            </h2>

            {pregunta.tipoPregunta.toLowerCase().includes('texto') ? (
              <div className="d-flex flex-column gap-2">
                {variant === 'residente' ? (
                  <p className="mb-0 text-sm text-neutral">
                    {pregunta.totalRespuestasTexto ?? pregunta.respuestasTexto.length} respuesta(s) de texto
                    registrada(s).
                  </p>
                ) : pregunta.respuestasTexto.length === 0 ? (
                  <p className="text-muted small mb-0">Sin respuestas de texto.</p>
                ) : (
                  pregunta.respuestasTexto.map((txt, i) => (
                    <div key={i} className="border rounded p-2 small bg-light text-break">
                      {txt}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {pregunta.opciones.map((opcion) => (
                  <div key={opcion.opcionPreguntaId}>
                    <div className="d-flex justify-content-between small mb-1">
                      <span>{opcion.texto}</span>
                      <span className="tabular-nums font-weight-medium">
                        {opcion.conteo} ({opcion.porcentaje.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="progress" style={{ height: '0.5rem' }}>
                      <div
                        className="progress-bar bg-primary"
                        role="progressbar"
                        style={{ width: `${opcion.porcentaje}%` }}
                        aria-valuenow={opcion.porcentaje}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResultadosEncuestaPage({ variant = 'admin' }: Props) {
  const { id } = useParams<{ id: string }>()
  const [resultados, setResultados] = useState<EncuestaResultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useQueryErrorToast(error)

  const listPath = variant === 'admin' ? '/admin/encuestas' : '/encuestas'
  const detallePath =
    variant === 'admin' ? `/admin/encuestas/${id}` : `/encuestas/${id}`

  const cargar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    const { data, problem, status } = await apiGet<EncuestaResultados>(`/ENC/Encuestas/${id}/resultados`)
    if (!data) {
      setError(problem?.detail ?? `Error ${status}`)
      setResultados(null)
    } else {
      setResultados(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (loading) {
    if (variant === 'residente') {
      return (
        <main className="mx-auto max-w-3xl px-4 py-6 md:px-8">
          <p className="text-neutral">Cargando resultados…</p>
        </main>
      )
    }
    return (
      <div className="cq-admin-page container-fluid py-4">
        <div className="placeholder-glow">
          <span className="placeholder col-8 mb-2" />
          <span className="placeholder col-12" />
        </div>
        <p className="text-muted mt-3">Cargando resultados…</p>
      </div>
    )
  }

  if (error || !resultados) {
    if (variant === 'residente') {
      return (
        <main className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 md:px-8">
          <Link to={listPath} className="text-sm text-primary hover:underline">
            ← Encuestas
          </Link>
          <p className="text-danger" role="status">
            {error ?? 'No se encontró la encuesta.'}
          </p>
          <button
            type="button"
            className="cursor-pointer text-sm text-primary underline"
            onClick={() => void cargar()}
          >
            Reintentar
          </button>
        </main>
      )
    }
    return (
      <div className="cq-admin-page container-fluid py-4">
        <p className="text-danger" role="status">
          {error ?? 'No se encontró la encuesta.'}
        </p>
        <button type="button" className="btn btn-link p-0" onClick={() => void cargar()}>
          Reintentar
        </button>
        <Link to={listPath} className="btn btn-link">
          <i className="mdi mdi-arrow-left mr-1" />
          Volver a encuestas
        </Link>
      </div>
    )
  }

  const totalRespuestasOpcion = resultados.preguntas.reduce(
    (acc, p) => acc + p.opciones.reduce((s, o) => s + o.conteo, 0),
    0,
  )

  if (variant === 'residente') {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8">
        <Link to={listPath} className="text-sm text-primary hover:underline">
          ← Encuestas
        </Link>
        <PageHeader title="Resultados" description={resultados.titulo} />
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">{resultados.totalParticipantes}</p>
            <p className="text-xs text-neutral">Participantes</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">{resultados.preguntas.length}</p>
            <p className="text-xs text-neutral">Preguntas</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-primary">{totalRespuestasOpcion}</p>
            <p className="text-xs text-neutral">Respuestas opción</p>
          </div>
        </div>
        <ResultadosPreguntas resultados={resultados} variant={variant} />
        <Link
          to={detallePath}
          className="text-sm text-primary hover:underline"
        >
          Ver encuesta
        </Link>
      </main>
    )
  }

  return (
    <div className="cq-admin-page container-fluid py-4">
      <PageHeader
        title="Resultados"
        description={resultados.titulo}
        actions={
          <Link to={detallePath} className="btn btn-outline-secondary btn-sm me-2">
            <i className="mdi mdi-format-list-bulleted mr-1" />
            Preguntas
          </Link>
        }
      />

      <div className="card border-0 bg-primary text-white mb-4 shadow-sm">
        <div className="card-body py-4">
          <div className="row text-center g-3">
            <div className="col-md-4">
              <div className="display-6 fw-bold">{resultados.totalParticipantes}</div>
              <div className="small opacity-75">Participantes</div>
            </div>
            <div className="col-md-4">
              <div className="display-6 fw-bold">{resultados.preguntas.length}</div>
              <div className="small opacity-75">Preguntas</div>
            </div>
            <div className="col-md-4">
              <div className="display-6 fw-bold">{totalRespuestasOpcion}</div>
              <div className="small opacity-75">Respuestas opción</div>
            </div>
          </div>
        </div>
      </div>

      <ResultadosPreguntas resultados={resultados} variant={variant} />
    </div>
  )
}
