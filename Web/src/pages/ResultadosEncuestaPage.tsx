import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import { PageHeader } from '../shared/components/admin'
import { apiGet } from '../shared/lib/apiClient'
import type { EncuestaResultados } from '../shared/types/encuestas'

export function ResultadosEncuestaPage() {
  const { id } = useParams<{ id: string }>()
  const [resultados, setResultados] = useState<EncuestaResultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    return (
      <div className="cq-admin-page container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          {error ?? 'No se encontró la encuesta.'}
        </div>
        <Link to="/admin/encuestas" className="btn btn-link">
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

  return (
    <div className="cq-admin-page container-fluid py-4">
      <PageHeader
        title="Resultados"
        description={resultados.titulo}
        actions={
          <Link to={`/admin/encuestas/${id}`} className="btn btn-outline-secondary btn-sm me-2">
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

      {resultados.preguntas.length === 0 ? (
        <p className="text-muted mt-4">No hay respuestas aún.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {resultados.preguntas.map((pregunta) => (
            <div key={pregunta.preguntaId} className="card">
              <div className="card-body">
                <h2 className="h6 font-weight-bold mb-3">{pregunta.texto}</h2>

                {pregunta.tipoPregunta.toLowerCase().includes('texto') ? (
                  <div className="d-flex flex-column gap-2">
                    {pregunta.respuestasTexto.length === 0 ? (
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
      )}
    </div>
  )
}
