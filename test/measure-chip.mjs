// Compare the command chip's box against neighboring inline-code boxes.
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
const result = await evaluate(`(() => {
  const chips = [...document.querySelectorAll('[data-coderef-command]')]
  const rect = node => node === undefined || node === null ? null : { width: Math.round(node.getBoundingClientRect().width * 10) / 10, height: Math.round(node.getBoundingClientRect().height * 10) / 10, top: Math.round(node.getBoundingClientRect().top * 10) / 10 }
  const style = node => node === undefined || node === null ? null : { display: getComputedStyle(node).display, lineHeight: getComputedStyle(node).lineHeight, fontSize: getComputedStyle(node).fontSize, padding: getComputedStyle(node).padding, border: getComputedStyle(node).border, verticalAlign: getComputedStyle(node).verticalAlign }
  return chips.map(chip => {
    const code = chip.closest('code')
    const para = chip.closest('p, li')
    return {
      text: chip.textContent,
      inCode: code !== null,
      chip: rect(chip), chipStyle: style(chip),
      code: rect(code), codeStyle: style(code),
      para: para === null ? null : { rect: rect(para), style: style(para) },
    }
  })
})()`)
console.log(JSON.stringify(result, null, 2))
ws.close()
process.exit(0)
