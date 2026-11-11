import { describe, expect, it } from 'vitest'
import { buildOpenApiDocument } from './export-openapi.js'

describe('buildOpenApiDocument', () => {
  it('renders the served contract as YAML without touching the database', async () => {
    const yaml = await buildOpenApiDocument()

    expect(yaml).toMatch(/^openapi: 3\.0\.3$/m)
    expect(yaml).toContain('/api/v1/auth/login:')
    expect(yaml).toContain('/api/v1/auth/me:')
    expect(yaml).toContain('/api/v1/providers/{providerId}:')
    expect(yaml).toContain('bearerAuth:')
  })

  it('is deterministic', async () => {
    expect(await buildOpenApiDocument()).toBe(await buildOpenApiDocument())
  })
})
