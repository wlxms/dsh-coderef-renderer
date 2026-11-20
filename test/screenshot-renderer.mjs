// Capture the custom renderer in headless Chrome and report computed styles so
// the styling parity can be checked (screenshot saved under tmp/).
// usage: node test/screenshot-renderer.mjs <token> [out.png]
import { writeFile, mkdir } from 'node:fs/promises'
import { strict as assert } from 'node:assert'

const token = process.argv[2]
const out = process.argv[3] ?? 'tmp/renderer.png'
assert.ok(typeof token === 'string' && token.length > 10, 'usage: node test/screenshot-renderer.mjs <token> [out.png]')
const cdpBase = process.env.CDP_BASE ?? 'http://127.0.0.1:9333'

const targets = await (await fetch(`${cdpBase}/json/list`)).json()
const page = targets.find(target => target.type === 'page')
assert.ok(page !== undefined, 'no page target')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})
let nextId = 1
const pending = new Map()
const errors = []
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) {
    const handler = pending.get(message.id)
    if (handler === undefined) return
    pending.delete(message.id)
    message.error !== undefined ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result)
    return
  }
  if (message.method === 'Runtime.exceptionThrown') {
    errors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'exception')
  }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return result.result?.value
}

await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: `http://127.0.0.1:3080/?token=${encodeURIComponent(token)}` })
await new Promise(resolve => setTimeout(resolve, 7000))

await evaluate(`(async () => {
  const byLabel = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === label)
  byLabel('打开侧边栏')?.click()
  await new Promise(r => setTimeout(r, 1200))
  const row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('加粗列出两个符号'))
  row?.click()
  await new Promise(r => setTimeout(r, 4500))
  const roots = [...document.querySelectorAll('[data-coderef-renderer]')]
  const root = roots.find(node => node.querySelector('.dcr-table-scroll') !== null)
    ?? roots.find(node => node.querySelector('.dcr-md pre') !== null)
    ?? roots.find(node => node.querySelector('.dcr-md') !== null && node.querySelector('[data-coderef-chip]') !== null)
    ?? roots.find(node => node.querySelector('.dcr-md') !== null)
    ?? roots[0]
    ?? [...document.querySelectorAll('p')].find(node => (node.textContent || '').includes('已把工作区从外到内'))
  const footers = [...document.querySelectorAll('[data-coderef-refs]')]
  for (const footer of footers) footer.open = true
  for (const body of document.querySelectorAll('.dcr-refs-body')) body.scrollTop = body.scrollHeight
  const target = footers.at(-1) ?? root
  target?.scrollIntoView({ block: 'end' })
  await new Promise(r => setTimeout(r, 800))
  return true
})()`)

const metrics = await evaluate(`(() => {
  const roots = [...document.querySelectorAll('[data-coderef-renderer]')]
  const root = roots.find(node => node.querySelector('.dcr-md') !== null && node.querySelector('[data-coderef-chip]') !== null)
    ?? roots.find(node => node.querySelector('.dcr-md') !== null)
  if (root === undefined) return { missing: true, roots: roots.length }
  const md = root.querySelector('.dcr-md')
  const p = md?.querySelector('p')
  const chip = root.querySelector('[data-coderef-chip]')
  const pre = md?.querySelector('pre')
  const h = md?.querySelector('h1, h2, h3')
  const table = md?.querySelector('table')
  const style = node => node === null || node === undefined ? null : {
    font: getComputedStyle(node).font,
    marginTop: getComputedStyle(node).marginTop,
    marginBottom: getComputedStyle(node).marginBottom,
    color: getComputedStyle(node).color,
    background: getComputedStyle(node).backgroundColor,
  }
  return {
    rootFound: true,
    p: style(p),
    chip: style(chip),
    chipIcon: style(chip?.querySelector('svg') ?? null),
    inlineCode: style(md?.querySelector('p code') ?? null),
    pre: style(pre),
    preRadius: pre === undefined || pre === null ? null : getComputedStyle(pre).borderRadius,
    heading: style(h),
    table: style(table),
    markdownFont: md === null ? null : getComputedStyle(md).font,
    tokens: {
      fontMarkdownBase: getComputedStyle(document.documentElement).getPropertyValue('--dsw-font-markdown-base'),
      fontMarkdownCode: getComputedStyle(document.documentElement).getPropertyValue('--dsw-font-markdown-code'),
      aliasLink: getComputedStyle(document.documentElement).getPropertyValue('--dsw-alias-link'),
      inlineCodeBg: getComputedStyle(document.documentElement).getPropertyValue('--dsw-alias-markdown-inline-code'),
    },
    reasoningRows: document.querySelectorAll('.dcr-reasoning').length,
    roots: roots.length,
    chips: root.querySelectorAll('[data-coderef-chip]').length,
  }
})()`)
console.log(JSON.stringify({ metrics, errors }, null, 2))

await mkdir('tmp', { recursive: true }).catch(() => {})
const shot = await send('Page.captureScreenshot', { format: 'png' })
const buffer = Buffer.from(shot.data, 'base64')
await writeFile(out, buffer)
console.log(`screenshot: ${out} (${buffer.length} bytes)`)
ws.close()
process.exit(0)

