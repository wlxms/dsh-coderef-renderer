// Debug one reference click through CDP.
import { strict as assert } from 'node:assert'
const token = process.argv[2]
assert.ok(token, 'usage: node test/probe-click.mjs <token>')
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
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value
await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: `http://127.0.0.1:3080/?token=${encodeURIComponent(token)}` })
await new Promise(r => setTimeout(r, 7000))
await evaluate(`(async () => {
  const byLabel = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === label)
  byLabel('打开侧边栏')?.click()
  await new Promise(r => setTimeout(r, 1200))
  const row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('加粗列出两个符号'))
  row?.click()
  await new Promise(r => setTimeout(r, 5000))
  return true
})()`)
const result = await evaluate(`(async () => {
  const chips = [...document.querySelectorAll('[data-coderef-chip]')]
  const chip = chips.find(node => (node.title || '').replace(/\\\\/g, '/').includes('lib/index.js:1216'))
  if (chip === undefined) return { clicked: false, chips: chips.length }
  const info = { clicked: true, text: chip.textContent, title: chip.title, parent: chip.parentElement?.tagName, className: chip.className }
  chip.click()
  await new Promise(r => setTimeout(r, 2500))
  return {
    ...info,
    lastOpen: window.__dshCoderefRenderer?.lastOpen ?? null,
    lastError: window.__dshCoderefRenderer?.lastError ?? null,
    lastPing: window.__dshCoderefRenderer?.lastPing ?? null,
    pingCount: document.querySelectorAll('.dsh-coderef-line-ping').length,
    previewRows: document.querySelectorAll('[data-code-preview] pre .line').length,
  }
})()`)
console.log(JSON.stringify(result, null, 2))
ws.close()
process.exit(0)
