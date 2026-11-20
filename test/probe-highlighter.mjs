// Probe the prose highlighter: ledger fetch + plain-text reference chips.
// usage: node test/probe-highlighter.mjs <token>
import { strict as assert } from 'node:assert'

const token = process.argv[2]
assert.ok(typeof token === 'string' && token.length > 10, 'usage: node test/probe-highlighter.mjs <token>')
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
  if (message.id === undefined) {
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.exception?.description ?? 'exception')
    return
  }
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
  let row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('加粗列出两个符号'))
  if (row === undefined) {
    const project = [...document.querySelectorAll('div')].find(e => /projectRow/.test(String(e.className)) && (e.textContent || '').trim() === 'dsh-coderef')
    project?.click()
    await new Promise(r => setTimeout(r, 1000))
    row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('加粗列出两个符号'))
  }
  row?.click()
  await new Promise(r => setTimeout(r, 5000))
  return true
})()`)

const state = await evaluate(`(() => {
  const all = [...document.querySelectorAll('button[data-coderef-chip]')]
  const inline = all.filter(node => node.closest('code') !== null)
  const strong = all.filter(node => node.classList.contains('dcr-strong-chip'))
  const prose = all.filter(node => node.closest('code') === null && !node.classList.contains('dcr-strong-chip'))
  const urlLinks = [...document.querySelectorAll('a[href]')].filter(node => /^https?:/.test(node.getAttribute('href') || ''))
  return {
    ledger: window.__dshCoderefRenderer?.lastLedger ?? null,
    all: all.length,
    inline: inline.length,
    strong: strong.length,
    prose: prose.length,
    proseSamples: prose.slice(0, 10).map(node => ({ text: node.textContent, title: node.title })),
    urlLinks: urlLinks.length,
    roots: document.querySelectorAll('[data-coderef-renderer]').length,
    refsFooters: document.querySelectorAll('[data-coderef-refs]').length,
    refsSummary: document.querySelector('[data-coderef-refs] summary')?.textContent ?? null,
  }
})()`)
console.log(JSON.stringify({ state, errors }, null, 2))
assert.equal(state.roots >= 1, true, 'renderer not mounted')
assert.ok(state.ledger !== null, 'ledger was not fetched by the renderer')
assert.ok(state.ledger.files >= 1, `ledger files missing: ${JSON.stringify(state.ledger)}`)
assert.ok(state.prose >= 1, `expected prose reference chips, got ${state.prose}; samples=${JSON.stringify(state.proseSamples)}`)
assert.ok(state.refsFooters >= 1, `expected a collapsed references footer, got ${state.refsFooters}`)
assert.ok(typeof state.refsSummary === 'string' && state.refsSummary.includes('引用'), `footer summary missing: ${JSON.stringify(state.refsSummary)}`)
ws.close()
console.log('highlighter-probe: OK (ledger fetched, prose references linkified)')
process.exit(0)

