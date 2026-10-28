import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@mdi/font/css/materialdesignicons.min.css'
import '../styles/bootstrap-pantone.css'
import '../styles/cq-admin.css'
import {
  parseOpcionesFromText,
  preguntaCreateSchema,
  type PreguntaCreateForm,
} from '../features/admin/encuestas/encuestasAdminSchemas'
import { useEncuestaDetalle } from '../features/admin/encuestas/useEncuestaDetalle'
import { useTiposPregunta } from '../features/admin/encuestas/useTiposPregunta'
import { ConfirmDialog, PageHeader } from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'
import type { OpcionPregunta, PreguntaDetalle } from '../shared/types/encuestas'

function esTextoLibre(tipo: string) {
  return tipo.toLowerCase().includes('texto')
}

function opcionesToText(opciones: OpcionPregunta[]) {
  return opciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((o) => o.texto)
    .join('\n')
}

export function AdminEncuestaDetallePage() {
  const { id: idParam } = useParams<{ id: string }>()
  const { encuestaId, detalle, loading, error, refetch } = useEncuestaDetalle(idParam)
  useQueryErrorToast(error)
  const { tipos } = useTiposPregunta()
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState<PreguntaDetalle | null>(null)
  const [deletePreguntaTarget, setDeletePreguntaTarget] = useState<PreguntaDetalle | null>(null)
  const [deleteOpcionTarget, setDeleteOpcionTarget] = useState<{
    pregunta: PreguntaDetalle
    opcion: OpcionPregunta
  } | null>(null)
  const [nuevaOpcionTexto, setNuevaOpcionTexto] = useState<Record<number, string>>({})

  const tipoDefaultId = tipos.find((t) => t.tipoPreguntaId === 6)?.tipoPreguntaId
    ?? tipos.find((t) => esTextoLibre(t.tipoPregunta))?.tipoPreguntaId
    ?? tipos[0]?.tipoPreguntaId
    ?? 1

  const form = useForm<PreguntaCreateForm>({
    resolver: zodResolver(preguntaCreateSchema),
    defaultValues: {
      texto: '',
      tipoPreguntaId: tipoDefaultId,
      requerida: true,
      opcionesTexto: 'Sí\nNo',
    },
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = form
  const tipoPreguntaIdSeleccionado = watch('tipoPreguntaId')
  const tipoSeleccionado = useMemo(
    () => tipos.find((t) => t.tipoPreguntaId === Number(tipoPreguntaIdSeleccionado)),
    [tipos, tipoPreguntaIdSeleccionado],
  )
  const muestraOpciones = tipoSeleccionado ? !esTextoLibre(tipoSeleccionado.tipoPregunta) : true

  const stats = useMemo(() => {
    const preguntas = detalle?.preguntas ?? []
    return {
      total: preguntas.length,
      requeridas: preguntas.filter((p) => p.requerida).length,
    }
  }, [detalle])

  const startEditPregunta = (p: PreguntaDetalle) => {
    setEditingPregunta(p)
    const tipoId = tipos.find((t) => t.tipoPregunta === p.tipoPregunta)?.tipoPreguntaId ?? tipoDefaultId
    reset({
      texto: p.texto,
      tipoPreguntaId: tipoId,
      requerida: p.requerida,
      opcionesTexto: opcionesToText(p.opciones),
    })
    setFormError(null)
  }

  const cancelEdit = () => {
    setEditingPregunta(null)
    reset({
      texto: '',
      tipoPreguntaId: tipoDefaultId,
      requerida: true,
      opcionesTexto: 'Sí\nNo',
    })
    setFormError(null)
  }

  const onSavePregunta = handleSubmit(async (data) => {
    if (!encuestaId) return
    setFormError(null)
    setSaving(true)

    const tipo = tipos.find((t) => t.tipoPreguntaId === data.tipoPreguntaId)
    if (!tipo) {
      setFormError('Selecciona un tipo de pregunta válido.')
      setSaving(false)
      return
    }

    const requiereOpciones = !esTextoLibre(tipo.tipoPregunta)
    const opciones = requiereOpciones ? parseOpcionesFromText(data.opcionesTexto) : []

    if (editingPregunta) {
      if (requiereOpciones && opciones.length < 2) {
        setFormError('Escribe al menos 2 opciones (una por línea).')
        setSaving(false)
        return
      }
      const { problem, status } = await apiPut(`/ENC/Encuestas/preguntas/${editingPregunta.preguntaId}`, {
        texto: data.texto,
        tipoPreguntaId: tipo.tipoPreguntaId,
        tipoPregunta: tipo.tipoPregunta,
        orden: editingPregunta.orden,
        requerida: data.requerida,
      })
      setSaving(false)
      if (problem) {
        setFormError(problem.detail ?? problem.title ?? `Error ${status}`)
        return
      }
      cancelEdit()
      await refetch()
      return
    }

    if (requiereOpciones && opciones.length < 2) {
      setFormError('Escribe al menos 2 opciones (una por línea).')
      setSaving(false)
      return
    }

    const body = {
      texto: data.texto,
      tipoPreguntaId: tipo.tipoPreguntaId,
      tipoPregunta: tipo.tipoPregunta,
      orden: 0,
      requerida: data.requerida,
      opciones: requiereOpciones ? opciones : undefined,
    }

    const { problem, status } = await apiPost(`/ENC/Encuestas/${encuestaId}/preguntas`, body)
    setSaving(false)
    if (problem) {
      if (status === 404 || status === 405) {
        setFormError(
          'El servidor no tiene el endpoint de preguntas. Reinicia GraphApi con el código actual.',
        )
      } else {
        setFormError(problem.detail ?? problem.title ?? `Error ${status}`)
      }
      return
    }

    reset({
      texto: '',
      tipoPreguntaId: tipoDefaultId,
      requerida: true,
      opcionesTexto: 'Sí\nNo',
    })
    await refetch()
  })

  const confirmDeletePregunta = async () => {
    if (!deletePreguntaTarget) return
    const { problem, status } = await apiDelete(
      `/ENC/Encuestas/preguntas/${deletePreguntaTarget.preguntaId}`,
    )
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    if (editingPregunta?.preguntaId === deletePreguntaTarget.preguntaId) {
      cancelEdit()
    }
    setDeletePreguntaTarget(null)
    await refetch()
  }

  const confirmDeleteOpcion = async () => {
    if (!deleteOpcionTarget) return
    const { problem, status } = await apiDelete(
      `/ENC/Encuestas/opciones/${deleteOpcionTarget.opcion.opcionPreguntaId}`,
    )
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    setDeleteOpcionTarget(null)
    await refetch()
  }

  const agregarOpcion = async (preguntaId: number) => {
    const texto = (nuevaOpcionTexto[preguntaId] ?? '').trim()
    if (!texto) return
    const { problem, status } = await apiPost(`/ENC/Encuestas/preguntas/${preguntaId}/opciones`, {
      texto,
      orden: 0,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    setNuevaOpcionTexto((prev) => ({ ...prev, [preguntaId]: '' }))
    await refetch()
  }

  const guardarOpcionTexto = async (opcion: OpcionPregunta, nuevoTexto: string) => {
    const texto = nuevoTexto.trim()
    if (!texto || texto === opcion.texto) return
    const { problem, status } = await apiPut(`/ENC/Encuestas/opciones/${opcion.opcionPreguntaId}`, {
      texto,
      valor: opcion.valor,
      orden: opcion.orden,
    })
    if (problem) {
      setFormError(problem.detail ?? `Error ${status}`)
      return
    }
    await refetch()
  }

  if (loading) {
    return (
      <div className="cq-admin-page container-fluid py-4">
        <p className="text-muted">Cargando encuesta…</p>
      </div>
    )
  }

  if (error || !detalle) {
    return (
      <div className="cq-admin-page container-fluid py-4">
        <p className="text-danger" role="status">{error ?? 'Encuesta no encontrada'}</p>
        {error && (
          <button type="button" className="btn btn-link p-0" onClick={() => void refetch()}>
            Reintentar
          </button>
        )}
        <Link to="/admin/encuestas" className="btn btn-link">Volver</Link>
      </div>
    )
  }

  const editable = !detalle.activa

  return (
    <div className="cq-admin-page container-fluid py-4">
      <PageHeader
        title={detalle.titulo}
        description={`${stats.total} pregunta${stats.total !== 1 ? 's' : ''} · ${stats.requeridas} obligatoria${stats.requeridas !== 1 ? 's' : ''}`}
        actions={
          <div className="d-flex gap-2">
            <Link to="/admin/encuestas" className="btn btn-outline-secondary btn-sm">
              <i className="mdi mdi-arrow-left mr-1" />
              Bandeja
            </Link>
            <Link
              to={`/admin/encuestas/${detalle.encuestaId}/resultados`}
              className="btn btn-outline-primary btn-sm"
            >
              Resultados
            </Link>
          </div>
        }
      />

      {!editable && (
        <div className="alert alert-info py-2 small" role="status">
          Encuesta publicada: no se pueden agregar ni quitar preguntas.
        </div>
      )}

      {formError && (
        <div className="alert alert-danger py-2 small" role="alert">{formError}</div>
      )}

      <div className="row mt-4">
        <div className="col-lg-7">
          <h2 className="h6 font-weight-bold mb-3">Preguntas</h2>
          {detalle.preguntas.length === 0 ? (
            <div className="cq-empty-state border rounded p-4">
              <i className="mdi mdi-help-circle-outline cq-empty-icon" />
              <p className="cq-empty-title mb-0">Sin preguntas aún</p>
              <p className="text-muted small">Agrega la primera en el panel derecho.</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {detalle.preguntas.map((p) => (
                <div key={p.preguntaId} className="card">
                  <div className="card-body py-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="min-w-0 flex-grow-1">
                        <span className="badge bg-light text-dark mr-2">{p.orden}</span>
                        <span className="font-weight-medium">{p.texto}</span>
                        <div className="mt-1 small text-muted">
                          {p.tipoPregunta}
                          {p.requerida && <span className="text-danger ml-2">Obligatoria</span>}
                        </div>
                        {p.opciones.length > 0 && (
                          <ul className="list-unstyled mt-2 mb-0 small">
                            {p.opciones.map((o) => (
                              <li key={o.opcionPreguntaId} className="d-flex align-items-center gap-2 mb-1">
                                {editable && !esTextoLibre(p.tipoPregunta) ? (
                                  <input
                                    className="form-control form-control-sm"
                                    defaultValue={o.texto}
                                    onBlur={(ev) => void guardarOpcionTexto(o, ev.target.value)}
                                    aria-label={`Opción ${o.texto}`}
                                  />
                                ) : (
                                  <span className="badge bg-secondary">{o.texto}</span>
                                )}
                                {editable && !esTextoLibre(p.tipoPregunta) && (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm text-danger p-0"
                                    onClick={() => setDeleteOpcionTarget({ pregunta: p, opcion: o })}
                                    aria-label={`Eliminar opción ${o.texto}`}
                                  >
                                    <i className="mdi mdi-close" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {editable && !esTextoLibre(p.tipoPregunta) && (
                          <div className="d-flex gap-2 mt-2">
                            <input
                              className="form-control form-control-sm"
                              placeholder="Nueva opción"
                              value={nuevaOpcionTexto[p.preguntaId] ?? ''}
                              onChange={(ev) =>
                                setNuevaOpcionTexto((prev) => ({
                                  ...prev,
                                  [p.preguntaId]: ev.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => void agregarOpcion(p.preguntaId)}
                            >
                              Añadir
                            </button>
                          </div>
                        )}
                      </div>
                      {editable && (
                        <div className="d-flex flex-column">
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => startEditPregunta(p)}
                            aria-label="Editar pregunta"
                          >
                            <i className="mdi mdi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-danger"
                            onClick={() => setDeletePreguntaTarget(p)}
                            aria-label="Eliminar pregunta"
                          >
                            <i className="mdi mdi-delete" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-5 mt-4 mt-lg-0">
          <div className="card">
            <div className="card-body">
              <h2 className="h6 font-weight-bold mb-3">
                {editingPregunta ? 'Editar pregunta' : 'Nueva pregunta'}
              </h2>
              {!editable ? (
                <p className="text-muted small mb-0">Solo borradores admiten cambios.</p>
              ) : (
                <form onSubmit={(e) => void onSavePregunta(e)} className="d-flex flex-column gap-3">
                  <div>
                    <label className="cq-label" htmlFor="preg-texto">Texto</label>
                    <input id="preg-texto" className="form-control" {...register('texto')} />
                    {errors.texto && <span className="text-danger small">{errors.texto.message}</span>}
                  </div>
                  <div>
                    <label className="cq-label" htmlFor="preg-tipo">Tipo</label>
                    <select
                      id="preg-tipo"
                      className="form-control"
                      {...register('tipoPreguntaId', { valueAsNumber: true })}
                    >
                      {tipos.map((t) => (
                        <option key={t.tipoPreguntaId} value={t.tipoPreguntaId}>
                          {t.tipoPregunta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-check">
                    <input id="preg-req" type="checkbox" className="form-check-input" {...register('requerida')} />
                    <label className="form-check-label" htmlFor="preg-req">Obligatoria</label>
                  </div>
                  {muestraOpciones && !editingPregunta && (
                    <div>
                      <label className="cq-label" htmlFor="preg-opts">Opciones (una por línea)</label>
                      <textarea id="preg-opts" className="form-control" rows={4} {...register('opcionesTexto')} />
                    </div>
                  )}
                  {editingPregunta && muestraOpciones && (
                    <p className="text-muted small mb-0">
                      Edita opciones en la lista de la izquierda (blur para guardar).
                    </p>
                  )}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      <i className="mdi mdi-content-save mr-1" />
                      {editingPregunta ? 'Guardar pregunta' : 'Agregar pregunta'}
                    </button>
                    {editingPregunta && (
                      <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deletePreguntaTarget !== null}
        title="Eliminar pregunta"
        message={
          deletePreguntaTarget
            ? `¿Eliminar la pregunta «${deletePreguntaTarget.texto}»?`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeletePreguntaTarget(null)}
        onConfirm={() => void confirmDeletePregunta()}
      />

      <ConfirmDialog
        open={deleteOpcionTarget !== null}
        title="Eliminar opción"
        message={
          deleteOpcionTarget
            ? `¿Eliminar la opción «${deleteOpcionTarget.opcion.texto}»?`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onCancel={() => setDeleteOpcionTarget(null)}
        onConfirm={() => void confirmDeleteOpcion()}
      />
    </div>
  )
}
