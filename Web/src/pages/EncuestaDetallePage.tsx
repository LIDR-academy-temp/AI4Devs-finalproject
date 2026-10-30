import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { esPreguntaSeleccionMultiple, esPreguntaTextoLibre } from '../features/encuestas/encuestaQuestionTypes'
import { normalizeEncuestaDetalle } from '../features/admin/encuestas/encuestaMappers'
import { parseEncuestaId } from '../features/encuestas/parseEncuestaId'
import { apiGet, apiPost } from '../shared/lib/apiClient'
import type { EncuestaDetalle, RespuestaItem } from '../shared/types/encuestas'

export function EncuestaDetallePage() {
  const { id: idParam } = useParams<{ id: string }>()
  const encuestaId = parseEncuestaId(idParam)
  const navigate = useNavigate()
  const [encuesta, setEncuesta] = useState<EncuestaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaItem>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  useQueryErrorToast(error)
  useQueryErrorToast(sendError)

  useEffect(() => {
    if (!encuestaId) {
      setEncuesta(null)
      setError('Identificador de encuesta no válido.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    apiGet<EncuestaDetalle>(`/ENC/Encuestas/${encuestaId}`)
      .then((res) => {
        if (res.data) {
          setEncuesta(normalizeEncuestaDetalle(res.data))
        } else {
          setError(res.problem?.detail ?? `Error ${res.status}`)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('No se pudo cargar la encuesta.')
        setLoading(false)
      })
  }, [encuestaId])

  const setOpcion = (preguntaId: number, opcionPreguntaId: number) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: { preguntaId, opcionPreguntaId },
    }))
  }

  const setTexto = (preguntaId: number, respuestaTexto: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: { preguntaId, respuestaTexto },
    }))
  }

  const handleSubmit = async () => {
    if (!encuesta || !encuestaId) return
    setSendError(null)
    setEnviando(true)
    const body = { respuestas: Object.values(respuestas) }
    const { problem, status } = await apiPost(`/ENC/Encuestas/${encuestaId}/respuestas`, body)
    setEnviando(false)
    if (problem) {
      setSendError(problem.detail ?? `Error ${status}`)
      return
    }
    setEnviado(true)
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-700">Cargando…</p>
      </main>
    )
  }
  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Link to="/encuestas" className="text-sm text-primary hover:underline">← Encuestas</Link>
        <EmptyState
          title="No se pudo cargar la encuesta"
          description="Revisa tu conexión o vuelve al listado."
        />
      </main>
    )
  }
  if (!encuesta) return null

  if (encuesta.yaParticipo || enviado) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 md:p-8 p-8 text-center">
        <svg className="h-12 w-12 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h1 className="text-xl font-semibold text-neutral-900">¡Gracias por tu participación!</h1>
        <p className="text-neutral-700">Tu respuesta ha sido registrada.</p>
        <Link
          to={`/encuestas/${encuestaId}/resultados`}
          className="cursor-pointer rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
        >
          Ver resultados
        </Link>
        <button
          type="button"
          className="rounded border border-neutral-200 bg-surface px-4 py-2 text-sm text-neutral-900 hover:bg-surface-alt"
          onClick={() => navigate('/encuestas')}
        >
          Volver a encuestas
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-8">
      <Link to="/encuestas" className="text-sm text-primary hover:underline">← Encuestas</Link>
      <PageHeader title={encuesta.titulo} description={encuesta.descripcion ?? undefined} />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        {encuesta.preguntas
          .sort((a, b) => a.orden - b.orden)
          .map((p) => (
            <fieldset
              key={p.preguntaId}
              className="rounded-lg border border-neutral-200 bg-surface-alt p-4 text-neutral-900"
            >
              <legend className="mb-2 px-1 font-medium text-neutral-900">
                {p.texto}
                {p.requerida && <span className="ml-1 text-danger">*</span>}
              </legend>

              {esPreguntaTextoLibre(p.tipoPregunta) ? (
                <textarea
                  className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm text-neutral-900"
                  rows={3}
                  required={p.requerida}
                  value={respuestas[p.preguntaId]?.respuestaTexto ?? ''}
                  onChange={(e) => setTexto(p.preguntaId, e.target.value)}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {p.opciones
                    .sort((a, b) => a.orden - b.orden)
                    .map((o) => (
                      <label key={o.opcionPreguntaId} className="flex items-center gap-2 text-sm text-neutral-800">
                        <input
                          type={esPreguntaSeleccionMultiple(p.tipoPregunta) ? 'checkbox' : 'radio'}
                          name={`p-${p.preguntaId}`}
                          checked={
                            respuestas[p.preguntaId]?.opcionPreguntaId === o.opcionPreguntaId
                          }
                          onChange={() => setOpcion(p.preguntaId, o.opcionPreguntaId)}
                          required={p.requerida && !respuestas[p.preguntaId]}
                        />
                        {o.texto}
                      </label>
                    ))}
                </div>
              )}
            </fieldset>
          ))}

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-surface px-4 py-2 text-sm text-neutral-900 hover:bg-surface-alt"
            onClick={() => navigate('/encuestas')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar respuestas'}
          </button>
        </div>
      </form>
    </main>
  )
}
