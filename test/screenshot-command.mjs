// Scroll to the first command chip and capture the rendered message.
import { writeFile, mkdir } from 'node:fs/promises'
const token = process.argv[2]
const out = process.argv[3] ?? 'tmp/command-chip.png'
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
  const chip = document.querySelector('[data-coderef-command]')
  chip?.scrollIntoView({ block: 'center' })
  await new Promise(r => setTimeout(r, 400))
  return true
})()`)
await mkdir('tmp', { recursive: true }).catch(() => {})
const shot = await send('Page.captureScreenshot', { format: 'png' })
await writeFile(out, Buffer.from(shot.data, 'base64'))
console.log(`screenshot: ${out}`)
ws.close()
process.exit(0)
