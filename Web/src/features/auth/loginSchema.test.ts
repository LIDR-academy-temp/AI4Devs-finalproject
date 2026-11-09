import { describe, expect, it } from 'vitest'
import { loginSchema } from './loginSchema'

describe('loginSchema', () => {
  it('acepta admin@local (seed DB-002)', () => {
    const r = loginSchema.safeParse({ correo: 'admin@local', password: 'x' })
    expect(r.success).toBe(true)
  })

  it('rechaza correo sin @', () => {
    const r = loginSchema.safeParse({ correo: 'adminlocal', password: 'x' })
    expect(r.success).toBe(false)
  })
})
