import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
})
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
page.on('console', (msg) => console.log('console:', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('pageerror:', err.message))
await page.goto('http://127.0.0.1:4173', { waitUntil: 'load' })
await page.waitForTimeout(5000)
console.log('title', await page.title())
console.log('bodyText', (await page.locator('body').innerText()).slice(0, 400))
console.log('triggers', await page.locator('.select-trigger').count())
console.log('fields', await page.locator('.field').count())
console.log('selects', await page.locator('select').count())
await browser.close()
