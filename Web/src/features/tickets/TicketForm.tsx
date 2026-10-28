import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { CatalogoItem } from '../../shared/types/tickets'
import { ticketFormSchema, type TicketFormValues } from './ticketFormSchema'
import { useCrearTicket } from './useCrearTicket'

type Props = {
  categorias: CatalogoItem[]
}

export function TicketForm({ categorias }: Props) {
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
    <form className="flex max-w-lg flex-col gap-3" onSubmit={onSubmit} noValidate>
      <label className="flex flex-col gap-1 text-sm">
        Categoría
        <select className="rounded border border-neutral-200 px-3 py-2" {...register('categoria')}>
          <option value="">Selecciona…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>{c.nombre}</option>
          ))}
        </select>
        {errors.categoria && <span className="text-danger">{errors.categoria.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input className="rounded border border-neutral-200 px-3 py-2" {...register('titulo')} />
        {errors.titulo && <span className="text-danger">{errors.titulo.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea rows={5} className="rounded border border-neutral-200 px-3 py-2" {...register('descripcion')} />
        {errors.descripcion && <span className="text-danger">{errors.descripcion.message}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Prioridad (opcional)
        <select className="rounded border border-neutral-200 px-3 py-2" {...register('prioridad')}>
          <option value="">Media (por defecto)</option>
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
          <option value="Crítica">Crítica</option>
        </select>
      </label>
      {rootError && <p className="text-sm text-danger" role="alert">{rootError}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {loading ? 'Enviando…' : 'Enviar incidencia'}
      </button>
    </form>
  )
}
