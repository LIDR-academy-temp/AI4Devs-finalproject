import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
import type { AdminPaseQrFormInput } from './visitasPaseSchemas'

type Props = {
  register: UseFormRegister<AdminPaseQrFormInput>
  watch: UseFormWatch<AdminPaseQrFormInput>
  errors: FieldErrors<AdminPaseQrFormInput>
}

export function PaseVigenciaFieldsAdmin({ register, watch, errors }: Props) {
  const tipoVisita = watch('tipoVisita')
  const modoVigencia = watch('modoVigencia')
  const esRango = tipoVisita === 'rangoDias'

  return (
    <>
      <fieldset className="mb-3">
        <legend className="cq-label small font-weight-bold">Tipo de visita</legend>
        <label className="mr-3">
          <input type="radio" value="unaOcasion" {...register('tipoVisita')} /> Una ocasión
        </label>
        <label>
          <input type="radio" value="rangoDias" {...register('tipoVisita')} /> Rango de días
        </label>
      </fieldset>
      {!esRango && (
        <fieldset className="mb-3">
          <legend className="cq-label small font-weight-bold">Vigencia</legend>
          <label className="mr-3">
            <input type="radio" value="horas" {...register('modoVigencia')} /> Por horas
          </label>
          <label>
            <input type="radio" value="dia" {...register('modoVigencia')} /> Todo el día
          </label>
        </fieldset>
      )}
      <div className="form-row">
        <div className="form-group col-md-6 mb-3">
          <label className="cq-label" htmlFor="pase-inicio">
            {esRango ? 'Desde' : 'Inicio'}
          </label>
          <input
            id="pase-inicio"
            type={esRango ? 'date' : 'datetime-local'}
            className="form-control"
            {...register('fechaInicio')}
          />
        </div>
        <div className="form-group col-md-6 mb-3">
          <label className="cq-label" htmlFor="pase-fin">
            {esRango ? 'Hasta' : modoVigencia === 'dia' ? 'Día (fin)' : 'Fin'}
          </label>
          <input
            id="pase-fin"
            type={esRango || modoVigencia === 'dia' ? 'date' : 'datetime-local'}
            className="form-control"
            {...register('fechaFin')}
          />
          {errors.fechaFin && <span className="text-danger small d-block">{errors.fechaFin.message}</span>}
        </div>
      </div>
    </>
  )
}
