import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type UseFormRegister } from 'react-hook-form'
import type { CatalogoItem, PrioridadCatalogoItem } from '../../../shared/types/tickets'
import type { UsuarioPadronItem } from '../../../shared/types/usuariosAdmin'
import {
  ticketAdminCreateSchema,
  ticketAdminEditSchema,
  type TicketAdminCreateForm,
  type TicketAdminEditForm,
} from './ticketAdminSchemas'

type CreateProps = {
  mode: 'create'
  categorias: CatalogoItem[]
  prioridades: PrioridadCatalogoItem[]
  residentes: UsuarioPadronItem[]
  disabled?: boolean
  onSubmit: (values: TicketAdminCreateForm) => void | Promise<void>
}

type EditProps = {
  mode: 'edit'
  categorias: CatalogoItem[]
  prioridades: PrioridadCatalogoItem[]
  defaultValues: TicketAdminEditForm
  disabled?: boolean
  onSubmit: (values: TicketAdminEditForm) => void | Promise<void>
}

export function TicketAdminForm(props: CreateProps | EditProps) {
  if (props.mode === 'create') {
    return <TicketAdminCreateForm {...props} />
  }
  return <TicketAdminEditFormInner {...props} />
}

function TicketAdminCreateForm({
  categorias,
  prioridades,
  residentes,
  disabled,
  onSubmit,
}: CreateProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketAdminCreateForm>({
    resolver: zodResolver(ticketAdminCreateSchema),
    defaultValues: {
      usuarioSolicitanteId: '',
      categoria: '',
      titulo: '',
      descripcion: '',
      prioridad: '',
    },
  })

  return (
    <form className="d-flex flex-column gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label className="cq-label" htmlFor="ticket-admin-residente">
          <i className="mdi mdi-account" />
          Residente solicitante <span className="text-danger">*</span>
        </label>
        <select
          id="ticket-admin-residente"
          className="form-control"
          disabled={disabled}
          {...register('usuarioSolicitanteId')}
        >
          <option value="">Selecciona…</option>
          {residentes.map((u) => (
            <option key={u.usuarioId} value={u.usuarioId}>
              {u.nombre} ({u.correo})
            </option>
          ))}
        </select>
        {errors.usuarioSolicitanteId && (
          <span className="text-danger small">{errors.usuarioSolicitanteId.message}</span>
        )}
      </div>
      <TicketFields
        register={register as unknown as UseFormRegister<TicketAdminEditForm>}
        errors={errors}
        categorias={categorias}
        prioridades={prioridades}
        disabled={disabled}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        Crear ticket
      </button>
    </form>
  )
}

function TicketAdminEditFormInner({
  categorias,
  prioridades,
  defaultValues,
  disabled,
  onSubmit,
}: EditProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketAdminEditForm>({
    resolver: zodResolver(ticketAdminEditSchema),
    defaultValues,
  })

  return (
    <form className="d-flex flex-column gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <TicketFields
        register={register}
        errors={errors}
        categorias={categorias}
        prioridades={prioridades}
        disabled={disabled}
      />
      <button type="submit" className="btn btn-primary" disabled={disabled}>
        Guardar cambios
      </button>
    </form>
  )
}

function TicketFields({
  register,
  errors,
  categorias,
  prioridades,
  disabled,
}: {
  // Campos comunes a alta y edición; el alta los registra sobre su form ampliado.
  register: UseFormRegister<TicketAdminEditForm>
  errors: Record<string, { message?: string } | undefined>
  categorias: CatalogoItem[]
  prioridades: PrioridadCatalogoItem[]
  disabled?: boolean
}) {
  return (
    <>
      <div>
        <label className="cq-label" htmlFor="ticket-admin-categoria">
          Categoría <span className="text-danger">*</span>
        </label>
        <select
          id="ticket-admin-categoria"
          className="form-control"
          disabled={disabled}
          {...register('categoria')}
        >
          <option value="">Selecciona…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        {errors.categoria && <span className="text-danger small">{errors.categoria.message}</span>}
      </div>
      <div>
        <label className="cq-label" htmlFor="ticket-admin-titulo">
          Título <span className="text-danger">*</span>
        </label>
        <input id="ticket-admin-titulo" className="form-control" disabled={disabled} {...register('titulo')} />
        {errors.titulo && <span className="text-danger small">{errors.titulo.message}</span>}
      </div>
      <div>
        <label className="cq-label" htmlFor="ticket-admin-descripcion">
          Descripción <span className="text-danger">*</span>
        </label>
        <textarea
          id="ticket-admin-descripcion"
          className="form-control"
          rows={4}
          disabled={disabled}
          {...register('descripcion')}
        />
        {errors.descripcion && <span className="text-danger small">{errors.descripcion.message}</span>}
      </div>
      <div>
        <label className="cq-label" htmlFor="ticket-admin-prioridad">
          Prioridad
        </label>
        <select id="ticket-admin-prioridad" className="form-control" disabled={disabled} {...register('prioridad')}>
          <option value="">Por defecto (sin especificar)</option>
          {prioridades.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
