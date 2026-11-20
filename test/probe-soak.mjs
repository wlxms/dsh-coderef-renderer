// Soak test: sample heap/DOM while the live session idles.
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
const samples = []
for (let index = 0; index < 7; index += 1) {
  const metrics = await send('Performance.getMetrics')
  const metric = name => metrics.metrics.find(entry => entry.name === name)?.value ?? null
  const state = await evaluate(`(() => ({
    nodes: document.getElementsByTagName('*').length,
    roots: document.querySelectorAll('[data-coderef-renderer]').length,
    chips: document.querySelectorAll('[data-coderef-chip]').length,
    renders: window.__dshCoderefRenderer?.renders ?? null,
    refsRequests: window.__dshCoderefRenderer?.refsRequests ?? null,
    lastError: window.__dshCoderefRenderer?.lastError ?? null,
  }))()`)
  samples.push({
    at: index * 10,
    heap: metric('JSHeapUsedSize'),
    nodes: state.nodes,
    roots: state.roots,
    chips: state.chips,
    renders: state.renders,
    debugRefsRequests: state.refsRequests,
    networkRefsRequests: refsRequests,
    lastError: state.lastError,
  })
  if (index < 6) await new Promise(resolve => setTimeout(resolve, 10000))
}
console.log(JSON.stringify(samples, null, 2))
ws.close()
process.exit(0)
