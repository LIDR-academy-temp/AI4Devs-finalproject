import { describe, expect, it } from 'vitest'
import { ticketFormSchema } from './ticketFormSchema'

describe('ticketFormSchema', () => {
  it('rechaza título vacío', () => {
    const result = ticketFormSchema.safeParse({
      categoria: 'Agua',
      titulo: '',
      descripcion: 'Detalle',
    })
    expect(result.success).toBe(false)
  })
})
