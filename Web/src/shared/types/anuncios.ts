export type AnuncioItem = {
  anuncioId: number
  titulo: string
  contenido: string
  fechaPublicacion: string
  vigenteHasta?: string | null
  tipoAnuncio?: string | null
  visto: boolean
}

export type TipoAnuncioItem = {
  tipoAnuncioId: number
  tipoAnuncio: string
}
