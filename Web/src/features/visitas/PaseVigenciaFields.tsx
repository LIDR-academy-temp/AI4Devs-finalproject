import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
import type { PaseFormInput } from './visitasPaseSchemas'

type Props = {
  register: UseFormRegister<PaseFormInput>
  watch: UseFormWatch<PaseFormInput>
  errors: FieldErrors<PaseFormInput>
  idPrefix?: string
  className?: string
}

export function PaseVigenciaFields({ register, watch, errors, idPrefix = 'pase', className = '' }: Props) {
  const tipoVisita = watch('tipoVisita')
  const modoVigencia = watch('modoVigencia')
  const esRango = tipoVisita === 'rangoDias'

  return (
    <div className={className}>
      <fieldset className="mb-3 space-y-2">
        <legend className="text-sm font-medium text-neutral-700">Tipo de visita</legend>
        <label className="mr-4 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" value="unaOcasion" {...register('tipoVisita')} />
          Una ocasión (un solo acceso)
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="radio" value="rangoDias" {...register('tipoVisita')} />
          Rango de días (varios accesos)
        </label>
      </fieldset>

      {!esRango && (
        <fieldset className="mb-3 space-y-2">
          <legend className="text-sm font-medium text-neutral-700">Vigencia</legend>
          <label className="mr-4 inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" value="horas" {...register('modoVigencia')} />
            Por horas
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" value="dia" {...register('modoVigencia')} />
            Todo el día
          </label>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor={`${idPrefix}-inicio`}>
            {esRango ? 'Desde (día)' : 'Inicio'}
          </label>
          <input
            id={`${idPrefix}-inicio`}
            type={esRango ? 'date' : 'datetime-local'}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            {...register('fechaInicio')}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700" htmlFor={`${idPrefix}-fin`}>
            {esRango ? 'Hasta (día)' : modoVigencia === 'dia' ? 'Día (fin)' : 'Fin'}
          </label>
          <input
            id={`${idPrefix}-fin`}
            type={esRango || modoVigencia === 'dia' ? 'date' : 'datetime-local'}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            {...register('fechaFin')}
          />
          {errors.fechaFin && <p className="mt-1 text-sm text-danger">{errors.fechaFin.message}</p>}
        </div>
      </div>
    </div>
  )
}
