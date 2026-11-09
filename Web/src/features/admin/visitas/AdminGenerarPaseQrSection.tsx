import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PaseQrCard } from '../../visitas/PaseQrCard'
import {
  adminPaseQrSchema,
  buildCrearPaseAdminBody,
  pasePuedeEditarse,
  paseToAdminFormValues,
  type AdminPaseQrFormInput,
  type AdminPaseQrFormValues,
} from '../../visitas/visitasPaseSchemas'
import { actualizarPaseAdmin, cancelarPaseAdmin, crearPaseAdmin, useAdminPases } from '../../visitas/useVisitasPase'
import { PaseVigenciaFieldsAdmin } from '../../visitas/PaseVigenciaFieldsAdmin'
import { AdminPasesQrTable } from './AdminPasesQrTable'
import { useToast } from '../../../shared/toast/ToastContext'
import {
  AdminListToolbar,
  AdminSidePanel,
  AdminSplitLayout,
  ConfirmDialog,
} from '../../../shared/components/admin'
import type { PaseVisita } from '../../../shared/types/visitasPase'
import type { CasaListItem, UsuarioPadronItem } from '../../../shared/types/usuariosAdmin'
import { formatCasaLabel } from './casaLabel'
import type { TipoIdentificacionDto } from '../../../shared/types/visitas'

type Props = {
  usuarios: UsuarioPadronItem[]
  casas: CasaListItem[]
  casasLoading: boolean
  tipos: TipoIdentificacionDto[]
  tiposLoading: boolean
}

type PanelMode = 'create' | 'edit' | 'share' | null

function defaultInicio() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function defaultFin() {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function defaultFormValues(tipos: TipoIdentificacionDto[]): AdminPaseQrFormInput {
  return {
    usuarioVisitadoId: '',
    casaId: '',
    nombreVisitante: '',
    tipoVisita: 'unaOcasion',
    modoVigencia: 'horas',
    fechaInicio: defaultInicio(),
    fechaFin: defaultFin(),
    tipoIdentificacionId: tipos[0]?.tipoIdentificacionId,
    numeroIdentificacion: '',
  }
}

export function AdminGenerarPaseQrSection({ usuarios, casas, casasLoading, tipos, tiposLoading }: Props) {
  const toast = useToast()
  const { pases: pasesAdmin, loading: listLoading, refetch: refetchPases } = useAdminPases()
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [editingPase, setEditingPase] = useState<PaseVisita | null>(null)
  const [sharePase, setSharePase] = useState<PaseVisita | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PaseVisita | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<AdminPaseQrFormInput, unknown, AdminPaseQrFormValues>({
    resolver: zodResolver(adminPaseQrSchema),
    defaultValues: defaultFormValues(tipos),
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = form

  const panelOpen = panelMode !== null

  const heroStats = useMemo(
    () => [{ label: 'Pases emitidos', value: pasesAdmin.length }],
    [pasesAdmin.length],
  )

  const closePanel = () => {
    setPanelMode(null)
    setEditingPase(null)
    setSharePase(null)
    setFormError(null)
  }

  const openCreate = () => {
    setFormError(null)
    reset(defaultFormValues(tipos))
    setEditingPase(null)
    setSharePase(null)
    setPanelMode('create')
  }

  const openEdit = (p: PaseVisita) => {
    if (!pasePuedeEditarse(p)) {
      toast.error('Este pase ya no se puede modificar (usado o expirado).')
      return
    }
    setFormError(null)
    reset(paseToAdminFormValues(p, tipos))
    setEditingPase(p)
    setSharePase(null)
    setPanelMode('edit')
  }

  const openShare = (p: PaseVisita) => {
    setFormError(null)
    setSharePase(p)
    setPanelMode('share')
  }

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true)
    setFormError(null)
    const body = buildCrearPaseAdminBody(values)
    if (panelMode === 'edit' && editingPase) {
      const { status, data, problem } = await actualizarPaseAdmin(editingPase.visitaGeneradaId, body)
      setSaving(false)
      if (status === 200 && data) {
        toast.success('Pase actualizado.')
        void refetchPases()
        setSharePase(data)
        setEditingPase(null)
        setPanelMode('share')
        return
      }
      setFormError(problem?.detail ?? 'No se pudo actualizar el pase.')
      return
    }

    const { status, data, problem } = await crearPaseAdmin(body)
    setSaving(false)
    if (status === 201 && data) {
      toast.success('Pase QR generado.')
      void refetchPases()
      setSharePase(data)
      setPanelMode('share')
      return
    }
    setFormError(problem?.detail ?? 'No se pudo generar el pase.')
  })

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    const { problem } = await cancelarPaseAdmin(cancelTarget.visitaGeneradaId)
    if (problem) {
      toast.error(problem.detail ?? 'No se pudo cancelar el pase.')
      return
    }
    setCancelTarget(null)
    if (sharePase?.visitaGeneradaId === cancelTarget.visitaGeneradaId) closePanel()
    toast.success('Pase cancelado.')
    void refetchPases()
  }

  const formFooter =
    panelMode === 'create' || panelMode === 'edit' ? (
      <>
        <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
          Cerrar
        </button>
        <button type="submit" form="admin-pase-qr-form" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : panelMode === 'edit' ? 'Guardar cambios' : 'Generar pase QR'}
        </button>
      </>
    ) : null

  const formPanelTitle = panelMode === 'edit' ? 'Modificar pase QR' : 'Nuevo pase QR'

  return (
    <>
      <AdminListToolbar
        title="Pases QR"
        metrics={heroStats}
        primaryAction={{
          label: 'Nuevo pase QR',
          onClick: openCreate,
          iconClass: 'mdi mdi-plus',
        }}
      />

      <AdminSplitLayout
        panelOpen={panelOpen}
        tablePane={
          <div className="card">
            <div className="card-body pt-3">
              <AdminPasesQrTable
                pases={pasesAdmin}
                loading={listLoading}
                selectedId={sharePase?.visitaGeneradaId ?? editingPase?.visitaGeneradaId ?? null}
                onShare={openShare}
                onEdit={openEdit}
                onCancel={setCancelTarget}
              />
            </div>
          </div>
        }
        formPane={
          panelMode === 'create' || panelMode === 'edit' ? (
            <AdminSidePanel
              visible
              title={formPanelTitle}
              subtitle="A nombre del residente visitado"
              iconClass="mdi mdi-qrcode"
              editing={panelMode === 'edit'}
              onClose={closePanel}
              footer={formFooter}
            >
              {formError && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {formError}
                </div>
              )}
              <form id="admin-pase-qr-form" className="cq-admin-form" onSubmit={onSubmit} noValidate>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pase-residente">
                    Residente visitado <span className="text-danger">*</span>
                  </label>
                  <select id="pase-residente" className="form-control" {...register('usuarioVisitadoId')}>
                    <option value="">Seleccione…</option>
                    {usuarios.map((u) => (
                      <option key={u.usuarioId} value={u.usuarioId}>
                        {u.nombre} ({u.correo})
                      </option>
                    ))}
                  </select>
                  {errors.usuarioVisitadoId && (
                    <span className="text-danger small d-block">{errors.usuarioVisitadoId.message}</span>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pase-casa">
                    Casa <span className="text-muted font-weight-normal">(opcional)</span>
                  </label>
                  <select id="pase-casa" className="form-control" {...register('casaId')} disabled={casasLoading}>
                    <option value="">Automática del residente</option>
                    {casas.map((c) => (
                      <option key={c.casaId} value={c.casaId}>
                        {formatCasaLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pase-nombre">
                    Nombre del visitante <span className="text-danger">*</span>
                  </label>
                  <input id="pase-nombre" className="form-control" {...register('nombreVisitante')} />
                  {errors.nombreVisitante && (
                    <span className="text-danger small d-block">{errors.nombreVisitante.message}</span>
                  )}
                </div>
                <PaseVigenciaFieldsAdmin register={register} watch={watch} errors={errors} />
                <div className="form-group mb-3">
                  <label className="cq-label" htmlFor="pase-tipo-id">
                    Tipo ID (opcional)
                  </label>
                  <select
                    id="pase-tipo-id"
                    className="form-control"
                    {...register('tipoIdentificacionId', { valueAsNumber: true })}
                    disabled={tiposLoading || tipos.length === 0}
                  >
                    <option value="">Predeterminado</option>
                    {tipos.map((t) => (
                      <option key={t.tipoIdentificacionId} value={t.tipoIdentificacionId}>
                        {t.tipoIdentificacion}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="cq-label" htmlFor="pase-num-id">
                    Número ID (opcional)
                  </label>
                  <input id="pase-num-id" className="form-control" {...register('numeroIdentificacion')} />
                </div>
              </form>
            </AdminSidePanel>
          ) : panelMode === 'share' && sharePase ? (
            <AdminSidePanel
              visible
              title="Compartir pase QR"
              subtitle={sharePase.nombreVisitante}
              iconClass="mdi mdi-share-variant"
              editing
              onClose={closePanel}
              footer={
                <button type="button" className="btn btn-outline-secondary" onClick={closePanel}>
                  Cerrar
                </button>
              }
            >
              <PaseQrCard pase={sharePase} />
            </AdminSidePanel>
          ) : null
        }
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancelar pase QR"
        message={
          cancelTarget
            ? `¿Cancelar el pase de ${cancelTarget.nombreVisitante}? El código QR dejará de ser válido.`
            : ''
        }
        confirmLabel="Cancelar pase"
        variant="danger"
        onConfirm={() => void handleConfirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  )
}
