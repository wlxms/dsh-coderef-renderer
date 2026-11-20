// Measure per-instance /refs polling and heap growth on the live session.
const token = process.argv[2]
const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json()
const page = targets.find(target => target.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
let nextId = 1
const pending = new Map()
let refsRequests = 0
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/coderef/refs')) refsRequests += 1
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
  if (result.exceptionDetails !== undefined) throw new Error(result.exceptionDetails.text)
  return result.result?.value
}
await send('Runtime.enable')
await send('Network.enable')
await send('Performance.enable')
await send('Page.enable')
await send('Page.navigate', { url: `http://127.0.0.1:3080/?token=${encodeURIComponent(token)}` })
await new Promise(resolve => setTimeout(resolve, 7000))
await evaluate(`(async () => {
  const byLabel = label => [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === label)
  byLabel('打开侧边栏')?.click()
  await new Promise(r => setTimeout(r, 1000))
  let row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('RuleSystem 实现分析'))
  if (row === undefined) {
    const project = [...document.querySelectorAll('div')].find(e => /projectRow/.test(String(e.className)) && (e.textContent || '').trim() === 'wangyuesrc')
    project?.click()
    await new Promise(r => setTimeout(r, 1000))
    row = [...document.querySelectorAll('div')].find(e => /sessionRow/.test(String(e.className)) && (e.textContent || '').includes('RuleSystem 实现分析'))
  }
  row?.click()
  return true
})()`)
await new Promise(resolve => setTimeout(resolve, 4000))
refsRequests = 0
const before = await send('Performance.getMetrics')
await new Promise(resolve => setTimeout(resolve, 12000))
const after = await send('Performance.getMetrics')
const metric = (snapshot, name) => snapshot.metrics.find(entry => entry.name === name)?.value ?? null
const state = await evaluate(`(() => ({
  roots: document.querySelectorAll('[data-coderef-renderer]').length,
  chips: document.querySelectorAll('[data-coderef-chip]').length,
  footer: document.querySelectorAll('[data-coderef-refs]').length,
  nodes: document.getElementsByTagName('*').length,
  timers: window.__dshCoderefRenderer?.debugTimers ?? null,
  renders: window.__dshCoderefRenderer?.renders ?? null,
}))()`)
console.log(JSON.stringify({
  refsRequestsIn12s: refsRequests,
  roots: state.roots,
  footer: state.footer,
  chips: state.chips,
  nodes: state.nodes,
  renders: state.renders,
  heapBefore: metric(before, 'JSHeapUsedSize'),
  heapAfter: metric(after, 'JSHeapUsedSize'),
  heapDelta: (metric(after, 'JSHeapUsedSize') ?? 0) - (metric(before, 'JSHeapUsedSize') ?? 0),
  documents: metric(after, 'Documents'),
  listeners: metric(after, 'JSEventListeners'),
}, null, 2))
ws.close()
process.exit(0)
