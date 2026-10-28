import { describe, expect, it } from 'vitest'
import { ARCHIVO_MAX_SIZE_MESSAGE, mapArchivoUploadHttpError } from './archivoUploadErrors'

describe('mapArchivoUploadHttpError', () => {
  it('devuelve mensaje amigable para 413', () => {
    expect(mapArchivoUploadHttpError(413)).toBe(ARCHIVO_MAX_SIZE_MESSAGE)
  })

  it('usa detail del servidor en otros códigos', () => {
    expect(mapArchivoUploadHttpError(400, 'Tipo inválido')).toBe('Tipo inválido')
  })
})
