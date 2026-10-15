import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { allWorkspaces } from '../src/lib/workspaces.ts'
import { productionOrigin } from '../src/lib/production-probe.ts'
const require = createRequire(process.env.NEXUS_BROWSER_PACKAGE + '/package.json')
const { chromium } = require('playwright')
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] })
const rows = []
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' })
    const page = await context.newPage()
    const paths = viewport.width === 1280 ? allWorkspaces.map(item => item.path) : ['/', '/workflow', '/artifacts', '/delivery']
    for (const path of paths) {
      let errors = 0
      const handler = () => errors++
      page.on('pageerror', handler)
      try {
        const response = await page.goto(productionOrigin + path, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.getByRole('heading', { name: 'Sign in to the Forge', exact: true }).waitFor({ timeout: 15000 })
        const enabled = await page.getByRole('button', { name: 'Send verification code', exact: true }).isEnabled()
        const inputVisible = await page.locator('#operator-email').isVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
        rows.push({ path, viewport: viewport.width, ok: response?.status() === 200 && enabled && inputVisible && !overflow && errors === 0, status: response?.status(), enabled, inputVisible, horizontalOverflow: overflow, uncaughtErrors: errors })
      } catch { rows.push({ path, viewport: viewport.width, ok: false, detail: 'Public application hydration or responsive shell check failed' }) }
      finally { page.off('pageerror', handler) }
    }
    await context.close()
  }
} finally { await browser.close() }
const report = { version: 'production-browser-v1', observedAt: new Date().toISOString(), scope: 'Unauthenticated public shell hydration on all registered desktop routes and four mobile routes. No OTP requested, no login, no mission execution.', rows, passed: rows.length === allWorkspaces.length + 4 && rows.every(row => row.ok) }
await writeFile(process.env.RELEASE_BROWSER_REPORT_PATH || '/tmp/nexus-production-browser.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ version: report.version, checks: rows.length, passed: rows.filter(row => row.ok).length, allPassed: report.passed }))
if (!report.passed) process.exitCode = 1
