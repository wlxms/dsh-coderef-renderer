// Inspect the live RuleSystem session without modifying it.
import { writeFile, mkdir } from 'node:fs/promises'
const token = process.argv[2]
const cdpBase = process.env.CDP_BASE ?? 'http://127.0.0.1:9333'
const targets = await (await fetch(`${cdpBase}/json/list`)).json()
const page = targets.find(target => target.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
let nextId = 1
const pending = new Map()
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id === undefined) return
  const handler = pending.get(message.id)
  if (handler === undefined) return
  pending.delete(message.id)
  message.error !== undefined ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails !== undefined) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result?.value
}
await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: `http://127.0.0.1:3080/?token=${encodeURIComponent(token)}` })
await new Promise(r => setTimeout(r, 7000))
const clicked = await evaluate(`(async () => {
  const byLabel = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === label)
  byLabel('打开侧边栏')?.click()
  await new Promise(r => setTimeout(r, 1200))
  const rows = [...document.querySelectorAll('div,button,a')]
  const row = rows.find(e => (e.textContent || '').trim().startsWith('RuleSystem 实现分析'))
  row?.click()
  await new Promise(r => setTimeout(r, 14000))
  return { clicked: row !== undefined, text: row?.textContent?.slice(0, 60) }
})()`)
const state = await evaluate(`(() => {
  const debug = window.__dshCoderefRenderer
  return {
    clicked: ${JSON.stringify(clicked)},
    roots: document.querySelectorAll('[data-coderef-renderer]').length,
    chips: document.querySelectorAll('[data-coderef-chip]').length,
    commandChips: document.querySelectorAll('[data-coderef-command]').length,
    inlineCodes: document.querySelectorAll('.dcr-md :not(pre) > code').length,
    inlineChipCodes: [...document.querySelectorAll('.dcr-md :not(pre) > code')].filter(code => code.querySelector('[data-coderef-chip]') !== null).length,
    footer: document.querySelectorAll('[data-coderef-refs]').length,
    ledger: debug?.lastLedger ?? null,
    sessionId: debug?.lastResolve?.sessionId ?? null,
  }
})()`)
console.log(JSON.stringify(state, null, 2))
await mkdir('tmp', { recursive: true }).catch(() => {})
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile('tmp/live-session.png', Buffer.from(shot.data, 'base64'))
ws.close()
process.exit(0)
