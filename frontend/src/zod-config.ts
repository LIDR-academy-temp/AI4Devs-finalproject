import { z } from 'zod'

// The CSP has no 'unsafe-eval': skip Zod's `new Function` probe, which the browser reports as a
// violation even though Zod catches it. Imported first in main.tsx, before any schema is built.
z.config({ jitless: true })
