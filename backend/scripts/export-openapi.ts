// Writes the served OpenAPI contract to docs/openapi.yaml. Needs `pnpm db:generate` first (app.ts imports the Prisma client).
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOpenApiDocument } from '../src/openapi/export-openapi.js'

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/openapi.yaml')

await writeFile(target, await buildOpenApiDocument(), 'utf8')
process.stdout.write(`OpenAPI contract written to ${path.relative(process.cwd(), target)}\n`)
