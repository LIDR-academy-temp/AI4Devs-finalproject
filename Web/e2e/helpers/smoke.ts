import { test } from '@playwright/test'

/** Solo corre con E2E_SMOKE=1 (Invoke-E2ESmoke.ps1). */
export const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip
