// Demo video of the main flow (issue #96, change demo-video): batch-clean in ProviderA-USD, from the analyst signing
// in to payments marking the batch as paid, with a short caption per stage and pauses to read each screen. Not a test:
// it is outside the features of playwright-bdd, `pnpm test:e2e` does not pick it up and no CI job runs it.
//
// Needs: `pnpm db:up`, `pnpm db:seed` right before and `pnpm dev` (http://localhost:5173 only, never the public URL),
// SEED_PASSWORD in the root .env, and ffmpeg in the PATH or in FFMPEG_PATH (Windows: `winget install Gyan.FFmpeg`).
// Run with `pnpm video:demo`. Output: docs/demo/recon-tool-demo.mp4, H.264 without audio, written only when the whole
// recording passed and the file is under 20 MB.
//
// It WRITES to the local database: it imports, processes and pays batch 123 of ProviderA-USD. Afterwards, with
// success or failure, it unpays, undoes and cancels through the API, off camera. Batch number 123 stays used up and
// RAM-07 stays primary in ProviderA-USD: run `pnpm db:seed` before `pnpm test:e2e` or `pnpm test:api`.
//
// Credentials (design D1): the password comes from SEED_PASSWORD, is set from the page into a field of type password
// (the video shows dots), the field is emptied after the click, and it never reaches a caption, a URL nor the console.
// The recording holds the viewport only, without an address bar. No trace is recorded.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, expect, type Locator, type Page } from '@playwright/test'
import globalSetup from '../global-setup.ts'
import { apiClient, cleanUp } from '../support/cleanup.ts'
import { expectedOf, formatAmount, outcomeOf, sameDecimal, sampleFile } from '../support/expected.ts'
import {
  amountPayable,
  assertFreshSeed,
  BASE_URL,
  type Created,
  cardNumber,
  downloadMerchantSummary,
  headerValue,
  processBatch,
  signIn,
  uploadFile,
} from './steps.ts'

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const SAMPLE = 'batch-clean'
const SETTLEMENT_DATE = '2026-10-24'
const OUTPUT = fileURLToPath(new URL('../../docs/demo/recon-tool-demo.mp4', import.meta.url))
const MAX_BYTES = 20 * 1024 * 1024
const SIZE = { width: 1280, height: 720 }
const CLEANUP_REASON = 'Demo video cleanup'
const RESEED =
  'Run pnpm db:seed before pnpm test:e2e or pnpm test:api: batch 123 of ProviderA-USD is used up and RAM-07 is primary.'

/** Pauses to read each screen (design D5). */
const HOLD_SHORT = 3_000
const HOLD = 5_500
const HOLD_LONG = 10_000

/** The captions, fixed in the script: none can carry the password (design D1, D4). */
const CAPTIONS = {
  intro: 'Recon Tool 2.0 · demo with synthetic data',
  signIn: '1. Sign in as analyst',
  import: '2. Import the provider file · ProviderA-USD',
  mapping: '3. Confirm the column mapping',
  analysis: '4. Analysis: rows read and matched',
  validations: '5. Run the eight validations',
  review: '6. Settlement Review: prefilled fees and settlement date',
  process: '7. Process the batch',
  summary: '8. Settlement Summary: amount payable and CSV download',
  paid: '9. Sign in as payments and mark as paid',
} as const

/** The labels of the validations table, in the order of the API (as in steps/validations.steps.ts). */
const VALIDATIONS: Record<string, string> = {
  provider_mismatch: 'Provider mismatch',
  non_recorded_adjustment: 'Non-recorded adjustment',
  duplicate_in_batch: 'Duplicate in batch',
  status_collision_in_batch: 'Status collision in batch',
  duplicate_across_batches: 'Duplicate across batches',
  status_collision_across_batches: 'Status collision across batches',
  missing_previous_to_batch: 'Missing previous to batch',
  missing_in_range: 'Missing in range',
}
const OUTCOMES = { passed: 'Passed', warning: 'Warning', blocked: 'Blocked', not_applicable: 'n/a' } as const

/** The ffmpeg to use: FFMPEG_PATH or the one in the PATH. Checked before anything is recorded (design D8). */
function findFfmpeg(): string {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
  const probe = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' })
  if (probe.error || probe.status !== 0) {
    throw new Error(
      'ffmpeg not found: install it with "winget install Gyan.FFmpeg" and open a new terminal, or set FFMPEG_PATH.',
    )
  }
  return ffmpeg
}

function checkCaptions() {
  const password = process.env.SEED_PASSWORD
  if (password && Object.values(CAPTIONS).some((caption) => caption.includes(password))) {
    throw new Error('A caption contains the password: change the captions.')
  }
}

/** The caption band at the foot of every page, kept in sessionStorage across reloads (design D4). */
function installCaptionBand() {
  const mount = () => {
    if (document.getElementById('demo-caption')) return
    const style = document.createElement('style')
    style.textContent = 'body { padding-bottom: 64px !important; }'
    document.head.append(style)
    const band = document.createElement('div')
    band.id = 'demo-caption'
    band.setAttribute('aria-hidden', 'true')
    Object.assign(band.style, {
      position: 'fixed',
      left: '0',
      right: '0',
      bottom: '0',
      height: '52px',
      alignItems: 'center',
      padding: '0 24px',
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#ffffff',
      font: '600 20px/1.2 system-ui, "Segoe UI", sans-serif',
      zIndex: '2147483647',
      pointerEvents: 'none',
    })
    let text = ''
    try {
      text = sessionStorage.getItem('demo-caption') ?? ''
    } catch {}
    band.textContent = text
    band.style.display = text ? 'flex' : 'none'
    document.body.append(band)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
}

class Recording {
  readonly marks: { at: number; caption: string }[] = []
  readonly waits: { what: string; ms: number }[] = []
  private readonly start = Date.now()
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async caption(text: string) {
    if (this.marks.at(-1)?.caption !== text) this.marks.push({ at: Date.now() - this.start, caption: text })
    await this.page.evaluate((value) => {
      try {
        sessionStorage.setItem('demo-caption', value)
      } catch {}
      const band = document.getElementById('demo-caption')
      if (band) {
        band.textContent = value
        band.style.display = 'flex'
      }
    }, text)
  }

  hold(ms: number) {
    return this.page.waitForTimeout(ms)
  }

  /** The video has no pointer: an outline shows what is about to be clicked. */
  async highlight(target: Locator) {
    await target.scrollIntoViewIfNeeded()
    await target.evaluate((element: HTMLElement) => {
      const { outline, outlineOffset } = element.style
      element.style.outline = '3px solid #f59e0b'
      element.style.outlineOffset = '3px'
      setTimeout(() => {
        element.style.outline = outline
        element.style.outlineOffset = outlineOffset
      }, 900)
    })
    await this.page.waitForTimeout(700)
  }

  async click(target: Locator) {
    await this.highlight(target)
    await target.click()
  }

  /** Brings a figure to the middle of the viewport, well above the caption band. */
  async center(target: Locator) {
    await target.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }))
  }

  /** A wait of the system (analyze, validate, process), measured to decide whether it is cut (design D5). */
  async timed(what: string, action: () => Promise<unknown>) {
    const from = Date.now()
    await action()
    this.waits.push({ what, ms: Date.now() - from })
  }

  report() {
    const time = (ms: number) =>
      `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`
    console.log('Timeline:')
    for (const mark of this.marks) console.log(`  ${time(mark.at)}  ${mark.caption}`)
    console.log(`  ${time(Date.now() - this.start)}  end`)
    console.log('Waits of the system:')
    for (const wait of this.waits) console.log(`  ${wait.what}: ${(wait.ms / 1000).toFixed(1)} s`)
  }
}

async function walkThrough(page: Page, rec: Recording, created: Created) {
  const expected = expectedOf(SAMPLE)
  const main = page.getByRole('navigation', { name: 'Main' })

  await page.goto(`${BASE_URL}/login`)
  await rec.caption(CAPTIONS.intro)
  await rec.hold(HOLD)

  // 1. Sign in as analyst.
  await rec.caption(CAPTIONS.signIn)
  await rec.hold(HOLD_SHORT)
  await signIn(page, 'analyst', () => rec.highlight(page.getByRole('button', { name: 'Sign in' })))
  await rec.hold(HOLD_SHORT)

  // 2. New Reconciliation and upload.
  await rec.caption(CAPTIONS.import)
  await rec.click(main.getByRole('link', { name: 'New Reconciliation' }))
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await rec.hold(800)
  await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
  await rec.hold(800)
  await page.getByLabel('Account').selectOption({ label: expected.account })
  await rec.hold(HOLD_SHORT)
  for (const file of expected.files) await uploadFile(page, created, sampleFile(SAMPLE, file))
  await rec.hold(HOLD)

  // 3. Column mapping.
  await rec.caption(CAPTIONS.mapping)
  await rec.click(page.getByRole('tab', { name: 'Mapping' }))
  await rec.hold(HOLD)
  await rec.click(page.getByRole('button', { name: 'Confirm mapping' }))
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
  await rec.hold(HOLD_SHORT)

  // 4. Analysis: counters and rows.
  await rec.caption(CAPTIONS.analysis)
  await rec.highlight(page.getByRole('button', { name: 'Analyze' }))
  await rec.timed('analyze', async () => {
    await page.getByRole('button', { name: 'Analyze' }).click()
    await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 90_000,
    })
  })
  await expect(page.getByRole('region', { name: 'Rows read' })).toHaveText(`Rows read${expected.rows.read}`)
  await expect(page.getByRole('region', { name: 'Matched', exact: true })).toHaveText(`Matched${expected.rows.matched}`)
  await expect(cardNumber(page, 'Unmatched')).toHaveText(String(expected.rows.unmatched))
  await rec.center(page.getByRole('region', { name: 'Rows read' }))
  await rec.hold(HOLD_LONG)
  await rec.center(page.getByRole('heading', { name: 'Rows', exact: true }).first())
  await rec.hold(HOLD)

  // 5. Validations.
  await rec.caption(CAPTIONS.validations)
  await rec.highlight(page.getByRole('button', { name: 'Run validations' }))
  const results = page.getByRole('table', { name: 'Validation results' })
  await rec.timed('validations', async () => {
    await page.getByRole('button', { name: 'Run validations' }).click()
    await expect(results).toBeVisible({ timeout: 60_000 })
  })
  for (const [code, value] of Object.entries(expected.validations ?? {})) {
    const findings = typeof value === 'number' ? value : Object.values(value).reduce((sum, n) => sum + n, 0)
    const row = results.getByRole('row').filter({ has: page.getByText(VALIDATIONS[code]!, { exact: true }) })
    await expect(row.getByRole('cell').nth(1), `result of ${code}`).toHaveText(
      OUTCOMES[outcomeOf(expected, code, findings)],
    )
  }
  await rec.center(results)
  await rec.hold(HOLD_LONG)

  // 6. Settlement Review: prefilled fees and settlement date.
  await rec.caption(CAPTIONS.review)
  await rec.click(page.getByRole('button', { name: 'Continue to settlement review' }))
  await expect(page.getByRole('region', { name: 'Import' }).getByText('validated', { exact: true })).toBeVisible()
  await rec.click(page.getByRole('link', { name: 'Settlement Review' }))
  await expect(page.getByRole('button', { name: /^Process batch \d+$/ })).toBeVisible()
  const fees = expected.batchFeesPrefilled ?? []
  await expect(page.getByRole('list', { name: 'Batch fees' }).getByRole('listitem')).toHaveCount(fees.length)
  for (const fee of fees) {
    const value = await page.getByLabel(`Amount — ${fee.feeType}`).inputValue()
    expect(sameDecimal(value, String(fee.amount)), `amount of ${fee.feeType}: ${value} for ${fee.amount}`).toBe(true)
  }
  await rec.center(page.getByRole('list', { name: 'Batch fees' }))
  await rec.hold(HOLD)
  const date = page.getByLabel('Settlement date')
  await rec.highlight(date)
  await date.fill(SETTLEMENT_DATE)
  await expect(page.getByRole('table', { name: 'Amount payable' })).toBeVisible({ timeout: 30_000 })
  await expect(amountPayable(page)).toHaveText(formatAmount(expected.summary!.amountPayable))
  await rec.center(page.getByRole('table', { name: 'Amount payable' }))
  await rec.hold(HOLD_LONG)

  // 7. Process, accepting RAM-07 as primary channel of the account.
  await rec.caption(CAPTIONS.process)
  const assign = page.getByRole('checkbox', { name: 'Assign these channels to this account as primary' })
  await rec.highlight(assign)
  await assign.check()
  await rec.hold(HOLD_SHORT)
  await rec.highlight(page.getByRole('button', { name: /^Process batch \d+$/ }))
  let batchNo = 0
  await rec.timed('process', async () => {
    batchNo = await processBatch(page, created)
  })

  // 8. Settlement Summary: amount payable and CSV download.
  await rec.caption(CAPTIONS.summary)
  await expect(headerValue(page, 'Status')).toHaveText('Processed · pending payment')
  await expect(amountPayable(page)).toHaveText(formatAmount(expected.summary!.amountPayable))
  await rec.hold(HOLD)
  await rec.center(page.getByRole('table', { name: 'Amount payable' }))
  await rec.hold(HOLD_LONG)
  await rec.highlight(page.getByRole('button', { name: 'Merchant summary' }))
  await downloadMerchantSummary(page, SAMPLE, batchNo)
  await rec.center(page.getByRole('button', { name: 'Merchant summary' }))
  await rec.hold(HOLD)

  // 9. payments marks it as paid.
  await rec.caption(CAPTIONS.paid)
  await rec.click(page.getByRole('button', { name: 'Sign out' }))
  await expect(page.getByLabel('User name')).toBeVisible()
  await rec.hold(HOLD_SHORT)
  await signIn(page, 'payments', () => rec.highlight(page.getByRole('button', { name: 'Sign in' })))
  await page.goto(`${BASE_URL}/settlements/${created.batchIds.at(-1)}`)
  await expect(headerValue(page, 'Status')).toBeVisible()
  await rec.caption(CAPTIONS.paid)
  await rec.hold(HOLD_SHORT)
  await rec.click(page.getByRole('button', { name: 'Mark as paid' }))
  await expect(headerValue(page, 'Status')).toHaveText('Paid')
  await expect(headerValue(page, 'Paid by')).toContainText('payments')
  await rec.center(headerValue(page, 'Status'))
  await rec.hold(HOLD_LONG)
  await rec.hold(HOLD_SHORT)
}

/** webm to H.264 without audio, written next to the output and moved onto it only when it is small enough. */
function convert(ffmpeg: string, webm: string) {
  mkdirSync(dirname(OUTPUT), { recursive: true })
  const partial = join(dirname(OUTPUT), `.${basename(OUTPUT, '.mp4')}.partial.mp4`)
  const args = ['-y', '-ss', '0.3', '-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '28']
  args.push('-pix_fmt', 'yuv420p', '-r', '25', '-an', '-movflags', '+faststart', partial)
  const run = spawnSync(ffmpeg, args, { encoding: 'utf8' })
  try {
    if (run.status !== 0)
      throw new Error(`ffmpeg failed: ${(run.stderr ?? '').trim().split('\n').slice(-3).join(' | ')}`)
    const bytes = statSync(partial).size
    if (bytes >= MAX_BYTES) throw new Error(`The video is ${(bytes / 1048576).toFixed(1)} MB, over 20 MB: raise -crf.`)
    renameSync(partial, OUTPUT)
    console.log(`saved docs/demo/recon-tool-demo.mp4 (${(bytes / 1048576).toFixed(1)} MB)`)
  } finally {
    rmSync(partial, { force: true })
  }
  const ffprobe = ffmpeg === 'ffmpeg' ? 'ffprobe' : join(dirname(ffmpeg), basename(ffmpeg).replace('ffmpeg', 'ffprobe'))
  const probe = spawnSync(
    ffprobe,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height',
      '-of',
      'compact',
      OUTPUT,
    ],
    { encoding: 'utf8' },
  )
  if (probe.status === 0) console.log(probe.stdout.trim())
}

async function main() {
  const ffmpeg = findFfmpeg()
  checkCaptions()
  await globalSetup()
  await assertFreshSeed(SAMPLE)

  const created: Created = { importIds: [], batchIds: [] }
  const videoDir = mkdtempSync(join(tmpdir(), 'recon-demo-'))
  try {
    const webm = await record(videoDir, created)
    convert(ffmpeg, webm)
  } finally {
    rmSync(videoDir, { recursive: true, force: true })
  }
}

/** Records the walk-through and, with success or failure, cleans up what it created (design D7). */
async function record(videoDir: string, created: Created): Promise<string> {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      viewport: SIZE,
      deviceScaleFactor: 1,
      acceptDownloads: true,
      recordVideo: { dir: videoDir, size: SIZE },
    })
    context.setDefaultTimeout(15_000)
    await context.addInitScript(installCaptionBand)
    const page = await context.newPage()
    const rec = new Recording(page)
    try {
      await walkThrough(page, rec, created)
    } finally {
      // Closing the context finishes the webm.
      await context.close()
      rec.report()
    }
    const webm = await page.video()?.path()
    if (!webm) throw new Error('Playwright did not record a video.')
    return webm
  } finally {
    await browser.close()
    const notes = await cleanUp(created, apiClient(), CLEANUP_REASON)
    for (const note of notes) console.log(`cleanup: ${note}`)
    console.log(RESEED)
  }
}

await main()
