import type {
  EncuestaDetalle,
  EncuestaListItem,
  EncuestaResultados,
  PreguntaDetalle,
  ResultadoPregunta,
  TipoPreguntaItem,
} from '../../../shared/types/encuestas'

function pick<T>(raw: Record<string, unknown>, camel: string, pascal: string): T | undefined {
  if (camel in raw) return raw[camel] as T
  if (pascal in raw) return raw[pascal] as T
  return undefined
}

export function normalizeEncuestaListItem(raw: EncuestaListItem | Record<string, unknown>): EncuestaListItem {
  const r = raw as Record<string, unknown>
  return {
    encuestaId: Number(pick(r, 'encuestaId', 'EncuestaId') ?? 0),
    titulo: String(pick(r, 'titulo', 'Titulo') ?? ''),
    descripcion: pick<string>(r, 'descripcion', 'Descripcion'),
    fechaInicio: String(pick(r, 'fechaInicio', 'FechaInicio') ?? ''),
    fechaFin: pick<string>(r, 'fechaFin', 'FechaFin'),
    activa: Boolean(pick(r, 'activa', 'Activa')),
    yaParticipo: Boolean(pick(r, 'yaParticipo', 'YaParticipo')),
  }
}

function normalizePregunta(raw: PreguntaDetalle | Record<string, unknown>): PreguntaDetalle {
  const r = raw as Record<string, unknown>
  const opcionesRaw = (pick<unknown[]>(r, 'opciones', 'Opciones') ?? []) as Record<string, unknown>[]
  return {
    preguntaId: Number(pick(r, 'preguntaId', 'PreguntaId') ?? 0),
    texto: String(pick(r, 'texto', 'Texto') ?? ''),
    tipoPregunta: String(pick(r, 'tipoPregunta', 'TipoPregunta') ?? ''),
    orden: Number(pick(r, 'orden', 'Orden') ?? 0),
    requerida: Boolean(pick(r, 'requerida', 'Requerida')),
    opciones: opcionesRaw.map((o) => ({
      opcionPreguntaId: Number(pick(o, 'opcionPreguntaId', 'OpcionPreguntaId') ?? 0),
      texto: String(pick(o, 'texto', 'Texto') ?? ''),
      valor: pick<string>(o, 'valor', 'Valor'),
      orden: Number(pick(o, 'orden', 'Orden') ?? 0),
    })),
  }
}

export function normalizeTipoPreguntaList(raw: unknown): TipoPreguntaItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const r = item as Record<string, unknown>
      const nombre = pick<string>(r, 'tipoPregunta', 'TipoPregunta')
      const id = Number(pick(r, 'tipoPreguntaId', 'TipoPreguntaId') ?? 0)
      if (!nombre) return null
      return { tipoPreguntaId: id, tipoPregunta: nombre }
    })
    .filter((x): x is TipoPreguntaItem => x !== null)
}

function normalizeResultadoPregunta(raw: Record<string, unknown>): ResultadoPregunta {
  const opcionesRaw = (pick<unknown[]>(raw, 'opciones', 'Opciones') ?? []) as Record<string, unknown>[]
  const textosRaw = pick<unknown[]>(raw, 'respuestasTexto', 'RespuestasTexto') ?? []
  return {
    preguntaId: Number(pick(raw, 'preguntaId', 'PreguntaId') ?? 0),
    texto: String(pick(raw, 'texto', 'Texto') ?? ''),
    tipoPregunta: String(pick(raw, 'tipoPregunta', 'TipoPregunta') ?? ''),
    opciones: opcionesRaw.map((o) => ({
      opcionPreguntaId: Number(pick(o, 'opcionPreguntaId', 'OpcionPreguntaId') ?? 0),
      texto: String(pick(o, 'texto', 'Texto') ?? ''),
      conteo: Number(pick(o, 'conteo', 'Conteo') ?? 0),
      porcentaje: Number(pick(o, 'porcentaje', 'Porcentaje') ?? 0),
    })),
    respuestasTexto: textosRaw.map((t) => String(t)),
    totalRespuestasTexto: Number(
      pick(raw, 'totalRespuestasTexto', 'TotalRespuestasTexto') ?? textosRaw.length,
    ),
  }
}

export function normalizeEncuestaResultados(
  raw: EncuestaResultados | Record<string, unknown>,
): EncuestaResultados {
  const r = raw as Record<string, unknown>
  const preguntasRaw = (pick<unknown[]>(r, 'preguntas', 'Preguntas') ?? []) as Record<string, unknown>[]
  return {
    encuestaId: Number(pick(r, 'encuestaId', 'EncuestaId') ?? 0),
    titulo: String(pick(r, 'titulo', 'Titulo') ?? ''),
    totalParticipantes: Number(pick(r, 'totalParticipantes', 'TotalParticipantes') ?? 0),
    preguntas: preguntasRaw.map((p) => normalizeResultadoPregunta(p)),
  }
}

export function normalizeEncuestaDetalle(raw: EncuestaDetalle | Record<string, unknown>): EncuestaDetalle {
  const base = normalizeEncuestaListItem(raw)
  const r = raw as Record<string, unknown>
  const preguntasRaw = (pick<unknown[]>(r, 'preguntas', 'Preguntas') ?? []) as Record<string, unknown>[]
  return {
    ...base,
    preguntas: preguntasRaw.map((p) => normalizePregunta(p)),
  }
}
