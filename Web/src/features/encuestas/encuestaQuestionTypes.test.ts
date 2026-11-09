import { describe, expect, it } from 'vitest'
import { esPreguntaSeleccionMultiple, esPreguntaTextoLibre } from './encuestaQuestionTypes'

describe('encuestaQuestionTypes', () => {
  it('Texto libre del catálogo DB-004', () => {
    expect(esPreguntaTextoLibre('Texto libre')).toBe(true)
    expect(esPreguntaTextoLibre('Texto')).toBe(true)
  })

  it('Opción múltiple es selección única (radio), no checkbox', () => {
    expect(esPreguntaTextoLibre('Opción múltiple')).toBe(false)
    expect(esPreguntaSeleccionMultiple('Opción múltiple')).toBe(false)
  })

  it('Múltiple opción permite varias respuestas', () => {
    expect(esPreguntaSeleccionMultiple('Múltiple opción')).toBe(true)
  })
})
