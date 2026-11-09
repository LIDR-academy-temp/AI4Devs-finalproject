import { describe, it, expect } from 'vitest'
import { cuotaMontoTotal } from './cuotaMontoUtils'

describe('cuotaMontoTotal', () => {
  it('suma base y mora', () => {
    expect(cuotaMontoTotal({ monto: 870, montoMora: 100 })).toBe(970)
  })

  it('trata mora ausente como cero', () => {
    expect(cuotaMontoTotal({ monto: 870 })).toBe(870)
  })
})
