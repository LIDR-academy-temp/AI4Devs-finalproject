import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CatalogoItem, PrioridadCatalogoItem } from '../../shared/types/tickets'
import { ticketFormSchema, type TicketFormValues } from './ticketFormSchema'
import { useCrearTicket } from './useCrearTicket'

type Props = {
  categorias: CatalogoItem[]
  prioridades: PrioridadCatalogoItem[]
}

export function TicketForm({ categorias, prioridades }: Props) {
  const { crear, loading } = useCrearTicket()
  const [rootError, setRootError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { categoria: '', titulo: '', descripcion: '', prioridad: undefined },
  })

  const onSubmit = handleSubmit(async (values) => {
    setRootError(null)
    const result = await crear({
      titulo: values.titulo,
      descripcion: values.descripcion,
      categoria: values.categoria,
      prioridad: values.prioridad,
    })

    if (!result.ok && result.errors) {
      for (const err of result.errors) {
        const field = err.field as keyof TicketFormValues | null | undefined
        if (field && field in values) {
          setError(field, { message: err.message })
        } else {
          setRootError(err.message)
        }
      }
    }
  })

  return (
    <form className="cq-portal-form max-w-2xl" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="ticket-categoria">Categoría</label>
        <select id="ticket-categoria" {...register('categoria')}>
          <option value="">Selecciona…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
        {errors.categoria && <p className="mt-1 text-sm text-danger">{errors.categoria.message}</p>}
      </div>
      <div>
        <label htmlFor="ticket-titulo">Título</label>
        <input id="ticket-titulo" placeholder="Resumen breve del problema" {...register('titulo')} />
        {errors.titulo && <p className="mt-1 text-sm text-danger">{errors.titulo.message}</p>}
      </div>
      <div>
        <label htmlFor="ticket-descripcion">Descripción</label>
        <textarea id="ticket-descripcion" rows={5} placeholder="Detalla qué ocurre y dónde" {...register('descripcion')} />
        {errors.descripcion && <p className="mt-1 text-sm text-danger">{errors.descripcion.message}</p>}
      </div>
      <div>
        <label htmlFor="ticket-prioridad">Prioridad (opcional)</label>
        <select id="ticket-prioridad" {...register('prioridad')}>
          <option value="">Por defecto</option>
          {prioridades.map((p) => (
            <option key={p.id} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      {rootError && (
        <p className="text-sm text-danger" role="alert">
          {rootError}
        </p>
      )}
      <button type="submit" disabled={loading} className="cq-portal-btn-primary w-full sm:w-auto disabled:opacity-60">
        {loading ? 'Enviando…' : 'Enviar incidencia'}
      </button>
    </form>
  )
}
