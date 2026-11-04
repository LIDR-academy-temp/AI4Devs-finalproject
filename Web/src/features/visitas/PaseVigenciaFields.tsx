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
    <div className={`space-y-4 ${className}`.trim()}>
      <div>
        <span className="cq-portal-field-label" id={`${idPrefix}-tipo-visita-label`}>
          Tipo de visita
        </span>
        <div className="cq-portal-segment-group" role="radiogroup" aria-labelledby={`${idPrefix}-tipo-visita-label`}>
          <label className="cq-portal-segment">
            <input type="radio" value="unaOcasion" {...register('tipoVisita')} />
            Una ocasión
          </label>
          <label className="cq-portal-segment">
            <input type="radio" value="rangoDias" {...register('tipoVisita')} />
            Varios días
          </label>
        </div>
      </div>

      {!esRango && (
        <div>
          <span className="cq-portal-field-label" id={`${idPrefix}-vigencia-label`}>
            Vigencia
          </span>
          <div className="cq-portal-segment-group" role="radiogroup" aria-labelledby={`${idPrefix}-vigencia-label`}>
            <label className="cq-portal-segment">
              <input type="radio" value="horas" {...register('modoVigencia')} />
              Por horas
            </label>
            <label className="cq-portal-segment">
              <input type="radio" value="dia" {...register('modoVigencia')} />
              Todo el día
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="cq-portal-field-label" htmlFor={`${idPrefix}-inicio`}>
            {esRango ? 'Desde' : 'Inicio'}
          </label>
          <input
            id={`${idPrefix}-inicio`}
            type={esRango ? 'date' : 'datetime-local'}
            className="w-full rounded-lg border border-neutral-200 bg-surface-alt px-3 py-2 text-sm"
            {...register('fechaInicio')}
          />
        </div>
        <div>
          <label className="cq-portal-field-label" htmlFor={`${idPrefix}-fin`}>
            {esRango ? 'Hasta' : modoVigencia === 'dia' ? 'Día' : 'Fin'}
          </label>
          <input
            id={`${idPrefix}-fin`}
            type={esRango || modoVigencia === 'dia' ? 'date' : 'datetime-local'}
            className="w-full rounded-lg border border-neutral-200 bg-surface-alt px-3 py-2 text-sm"
            {...register('fechaFin')}
          />
          {errors.fechaFin && <p className="mt-1 text-sm text-danger">{errors.fechaFin.message}</p>}
        </div>
      </div>
    </div>
  )
}
