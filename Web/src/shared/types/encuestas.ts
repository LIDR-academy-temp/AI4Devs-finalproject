export interface TipoPreguntaItem {
  tipoPreguntaId: number
  tipoPregunta: string
}

export interface EncuestaListItem {
  encuestaId: number
  titulo: string
  descripcion?: string
  fechaInicio: string
  fechaFin?: string
  activa: boolean
  yaParticipo: boolean
}

export interface OpcionPregunta {
  opcionPreguntaId: number
  texto: string
  valor?: string
  orden: number
}

export interface PreguntaDetalle {
  preguntaId: number
  texto: string
  tipoPregunta: string
  orden: number
  requerida: boolean
  opciones: OpcionPregunta[]
}

export interface EncuestaDetalle {
  encuestaId: number
  titulo: string
  descripcion?: string
  fechaInicio: string
  fechaFin?: string
  activa: boolean
  yaParticipo: boolean
  preguntas: PreguntaDetalle[]
}

export interface ResultadoOpcion {
  opcionPreguntaId: number
  texto: string
  conteo: number
  porcentaje: number
}

export interface ResultadoPregunta {
  preguntaId: number
  texto: string
  tipoPregunta: string
  opciones: ResultadoOpcion[]
  respuestasTexto: string[]
}

export interface EncuestaResultados {
  encuestaId: number
  titulo: string
  totalParticipantes: number
  preguntas: ResultadoPregunta[]
}

export interface OpcionCrearRequest {
  texto: string
  valor?: string
  orden: number
}

export interface PreguntaCrearRequest {
  texto: string
  tipoPreguntaId?: number
  tipoPregunta: string
  orden: number
  requerida: boolean
  opciones?: OpcionCrearRequest[]
}

export interface EncuestaCrearRequest {
  titulo: string
  descripcion?: string
  fechaInicio: string
  fechaFin?: string
  preguntas: PreguntaCrearRequest[]
}

export interface RespuestaItem {
  preguntaId: number
  opcionPreguntaId?: number
  respuestaTexto?: string
}
