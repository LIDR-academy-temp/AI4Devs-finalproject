import { describe, expect, it } from 'vitest'
import { estadosDestinoPermitidos } from './ticketTransitions'

describe('ticketTransitions', () => {
  it('Nuevo permite seguimiento y cerrado', () => {
    expect(estadosDestinoPermitidos('Nuevo')).toEqual(['En seguimiento', 'Cerrado'])
  })

  it('Cerrado no permite salidas', () => {
    expect(estadosDestinoPermitidos('Cerrado')).toEqual([])
  })
})
