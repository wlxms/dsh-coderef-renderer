// Probe the rendered DOM of the custom renderer (computed styles, code fences,
// reasoning rows) through CDP. usage: node test/probe-dom.mjs <token>
import { strict as assert } from 'node:assert'

const token = process.argv[2]
assert.ok(typeof token === 'string' && token.length > 10, 'usage: node test/probe-dom.mjs <token>')
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
  return true
})()`)

const result = await evaluate(`(() => {
  const roots = [...document.querySelectorAll('[data-coderef-renderer]')]
  const root = roots.find(node => node.querySelector('.dcr-md p') !== null)
  const md = root?.querySelector('.dcr-md')
  const style = node => node === null || node === undefined ? null : {
    tag: node.tagName,
    className: String(node.className).slice(0, 120),
    text: (node.textContent || '').slice(0, 80),
    font: getComputedStyle(node).font,
    marginTop: getComputedStyle(node).marginTop,
    marginBottom: getComputedStyle(node).marginBottom,
    padding: getComputedStyle(node).padding,
    background: getComputedStyle(node).backgroundColor,
    borderRadius: getComputedStyle(node).borderRadius,
    color: getComputedStyle(node).color,
  }
  const pre = md?.querySelector('pre')
  const codeBlockRoot = pre === undefined || pre === null ? null : pre.closest('[class*="code"], [class*="root"]')
  return {
    root: Boolean(root),
    roots: roots.length,
    markdownFont: md === null || md === undefined ? null : getComputedStyle(md).font,
    p: style(md?.querySelector('p')),
    strong: style(md?.querySelector('strong')),
    inlineCode: style(md?.querySelector('p code')),
    link: style(md?.querySelector('a')),
    heading: style(md?.querySelector('h1, h2, h3')),
    pre: style(pre),
    preHTML: pre === undefined || pre === null ? null : pre.outerHTML.slice(0, 400),
    codeBlockRoot: style(codeBlockRoot),
    reasoning: [...document.querySelectorAll('.dcr-reasoning')].slice(0, 2).map(node => ({
      state: node.getAttribute('data-state'),
      text: (node.textContent || '').slice(0, 120),
      height: getComputedStyle(node).height,
      font: getComputedStyle(node).font,
    })),
    codeBlocks: [...document.querySelectorAll('.dcr-md pre')].slice(0, 3).map(pre => ({
      text: (pre.textContent || '').slice(0, 100),
      lang: pre.getAttribute('data-language') ?? pre.querySelector('code')?.className ?? null,
      outer: pre.parentElement?.outerHTML.slice(0, 300),
    })),
    tables: document.querySelectorAll('.dcr-table-scroll').length,
    tableHTML: (() => {
      const table = document.querySelector('.dcr-table-scroll')
      return table === null ? null : table.outerHTML.slice(0, 1600)
    })(),
    chipClosestCode: (() => {
      const chip = document.querySelector('[data-coderef-chip]')
      const code = chip?.closest('code')
      if (code === null || code === undefined) return null
      return {
        bg: getComputedStyle(code).backgroundColor,
        border: getComputedStyle(code).border,
        padding: getComputedStyle(code).padding,
        borderRadius: getComputedStyle(code).borderRadius,
      }
    })(),
    chipRect: (() => {
      const chip = document.querySelector('[data-coderef-chip]')
      return chip === null ? null : { width: chip.getBoundingClientRect().width, height: chip.getBoundingClientRect().height }
    })(),
    preChain: (() => {
      const pre = [...document.querySelectorAll('.dcr-md pre')].find(node => node.textContent.includes('export const inject'))
      if (pre === undefined) return null
      const chain = []
      let node = pre
      while (node !== null && chain.length < 8) {
        chain.push(node.tagName + '.' + String(node.className).split(' ').slice(0, 2).join('.'))
        node = node.parentElement
      }
      return chain
    })(),
    bodyFont: getComputedStyle(document.body).font,
    tokenProbe: (() => {
      const probe = document.createElement('div')
      probe.style.font = 'var(--dsw-font-markdown-base)'
      document.body.appendChild(probe)
      const value = getComputedStyle(probe).font
      probe.remove()
      return value
    })(),
  }
})()`)
console.log(JSON.stringify(result, null, 2))
ws.close()
process.exit(0)

