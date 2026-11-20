// E2E check for the renderer plugin: boot the GUI in headless Chrome, open the
// existing session, and assert the custom assistant-step renderer + reference
// chips + sidebar ping are active.
// usage: node test/e2e-renderer.mjs <token> ; env CDP_BASE=http://127.0.0.1:9333
import { strict as assert } from 'node:assert'

const token = process.argv[2]
assert.ok(typeof token === 'string' && token.length > 10, 'usage: node test/e2e-renderer.mjs <token>')
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
const consoleLines = []
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
  if (message.method === 'Runtime.consoleAPICalled') {
    consoleLines.push((message.params.args ?? []).map(arg => arg.value ?? arg.description ?? '').join(' '))
  } else if (message.method === 'Runtime.exceptionThrown') {
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

const opened = await evaluate(`(async () => {
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
assert.equal(opened, true)

const state = await evaluate(`(() => {
  const chips = [...document.querySelectorAll('[data-coderef-chip]')].map(node => ({
    text: (node.textContent || '').trim(),
    title: node.title || '',
  }))
  return {
    renderer: window.__dshCoderefRenderer ?? null,
    legacy: window.__dshCoderef ?? null,
    marker: document.querySelector('[data-coderef-renderer]')?.getAttribute('data-coderef-renderer') ?? null,
    roots: document.querySelectorAll('[data-coderef-renderer]').length,
    strongChips: document.querySelectorAll('.dcr-strong-chip').length,
    chips,
    rawAsterisks: (document.body.innerText || '').includes('**AssistantNodeView**'),
    bodyTail: (document.body.innerText || '').slice(-800),
  }
})()`)

console.log(JSON.stringify({
  renderer: state.renderer,
  legacyVersion: state.legacy?.version ?? null,
  roots: state.roots,
  chipCount: state.chips.length,
  chips: state.chips.slice(0, 12),
  rawAsterisks: state.rawAsterisks,
  consoleErrors: errors,
  rendererConsole: consoleLines.filter(line => line.includes('dsh-coderef-renderer')),
}, null, 2))

assert.equal(state.roots >= 1, true, `custom renderer root missing: ${JSON.stringify({ roots: state.roots, renderer: state.renderer })}`)
assert.equal(state.marker, 'fork', `expected the fork renderer marker: ${JSON.stringify({ marker: state.marker })}`)
assert.equal(state.renderer?.mounted, true, 'renderer debug should report mounted')
assert.equal(state.rawAsterisks, false, 'raw **X** must not remain in rendered text')
assert.ok(state.chips.length >= 8, `expected several reference chips, got ${state.chips.length}`)
assert.ok(state.strongChips >= 1, `expected at least one bold reference chip, got ${state.strongChips}`)
assert.ok(state.chips.some(chip => chip.title.replace(/\\/g, '/').includes('lib/index.js:1216')), `inline path chip missing: ${JSON.stringify(state.chips.slice(0, 8))}`)
assert.ok(state.chips.some(chip => chip.text.includes('AssistantNodeView')), 'symbol chip missing')
assert.ok(state.chips.some(chip => chip.text.includes('useTurnData')), 'snippet chip expected')
assert.ok(errors.filter(text => !/favicon/i.test(text)).length === 0, `console errors: ${JSON.stringify(errors)}`)

// Click one chip: sidebar preview + line ping must run (IDE is best-effort).
const ping = await evaluate(`(async () => {
  const matches = [...document.querySelectorAll('[data-coderef-chip]')]
    .filter(node => (node.title || '').replace(/\\\\/g, '/').includes('lib/index.js:1216'))
  const chip = matches[0]
  if (chip === undefined) return { clicked: false }
  const chipInfo = { text: chip.textContent, title: chip.title, parent: chip.parentElement?.tagName, matches: matches.length }
  chip.click()
  await new Promise(resolve => setTimeout(resolve, 2500))
  const marked = [...document.querySelectorAll('.dsh-coderef-line-ping')]
  const all = [...document.querySelectorAll('[data-code-preview] pre .line')]
  const index = marked.length > 0 ? all.indexOf(marked[0]) : -1
  return {
    clicked: true,
    chipInfo,
    count: marked.length,
    lineNumber: index >= 0 ? index + 1 : null,
    lastOpen: window.__dshCoderefRenderer?.lastOpen ?? null,
    lastPing: window.__dshCoderefRenderer?.lastPing ?? null,
    previewOpen: all.length > 0,
  }
})()`)
assert.equal(ping.clicked, true, 'inline chip must be clickable')
assert.equal(ping.previewOpen, true, 'sidebar preview must open')
assert.equal(ping.lastOpen?.previewOpened, true, 'sidebar preview must open before/independently of IDE')
assert.ok(ping.count >= 1 || ping.lastPing?.rows >= 1, `line ping missing: ${JSON.stringify(ping)}`)
if (ping.count >= 1) {
  assert.equal(ping.lineNumber, 1216, `ping must target source line 1216: ${JSON.stringify(ping)}`)
} else {
  assert.equal(ping.lastPing?.line, 1216, `ping must target source line 1216: ${JSON.stringify(ping)}`)
}

ws.close()
console.log('renderer-e2e: OK (custom assistant-step renderer, chips, sidebar ping)')
process.exit(0)


