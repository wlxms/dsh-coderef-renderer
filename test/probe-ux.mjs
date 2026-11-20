// UX probe: left click = sidebar only; right click = IDE picker; footer folds.
import { strict as assert } from 'node:assert'
const token = process.argv[2]
assert.ok(token, 'usage: node test/probe-ux.mjs <token>')
const cdpBase = process.env.CDP_BASE ?? 'http://127.0.0.1:9333'
const targets = await (await fetch(`${cdpBase}/json/list`)).json()
const page = targets.find(target => target.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }) })
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
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value
await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: `http://127.0.0.1:3080/?token=${encodeURIComponent(token)}` })
await new Promise(r => setTimeout(r, 7000))
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

const state = await evaluate(`(async () => {
  const chips = [...document.querySelectorAll('[data-coderef-chip]')]
  const chip = chips.find(node => (node.title || '').replace(/\\\\/g, '/').includes('lib/index.js:1216'))
  if (chip === undefined) return { missing: true, chips: chips.length }
  chip.click()
  await new Promise(r => setTimeout(r, 1500))
  const leftClick = {
    lastOpen: window.__dshCoderefRenderer?.lastOpen ?? null,
    lastIde: window.__dshCoderefRenderer?.lastIde ?? null,
    pingCount: document.querySelectorAll('.dsh-coderef-line-ping').length,
    previewOpen: document.querySelectorAll('[data-code-preview] pre .line').length > 0,
  }
  chip.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 140, clientY: 180 }))
  await new Promise(r => setTimeout(r, 800))
  const menu = document.querySelector('[data-coderef-menu]')
  const menuButtons = [...document.querySelectorAll('[role="menu"] button')]
  const buttons = menuButtons.map(node => node.textContent)
  const actionButton = menuButtons.find(node => /复制路径/.test(node.textContent || ''))
  actionButton?.click()
  await new Promise(r => setTimeout(r, 1200))
  const rightClick = {
    menuOpened: menu !== null,
    buttons,
    lastIde: window.__dshCoderefRenderer?.lastIde ?? null,
    lastReveal: window.__dshCoderefRenderer?.lastReveal ?? null,
    menuClosed: document.querySelector('[data-coderef-menu]') === null,
  }
  const footer = document.querySelector('[data-coderef-refs]')
  footer?.querySelector('summary')?.click()
  await new Promise(r => setTimeout(r, 200))
  return {
    leftClick,
    rightClick,
    footer: footer === null ? null : {
      summary: footer.querySelector('summary')?.textContent ?? null,
      items: footer.querySelectorAll('.dcr-ref-item').length,
      open: footer.hasAttribute('open'),
    },
    errors: [],
  }
})()`)
console.log(JSON.stringify(state, null, 2))
assert.equal(state.missing, undefined, 'reference chip missing')
assert.equal(state.leftClick.lastOpen?.previewOpened, true, 'left click must open the sidebar')
assert.equal(state.leftClick.lastOpen?.ideOpened, false, 'left click must not launch an IDE')
assert.equal(state.leftClick.lastIde, null, 'left click must not record an IDE launch')
assert.equal(state.rightClick.menuOpened, true, 'right click must open the context menu')
assert.ok(state.rightClick.buttons.includes('在资源管理器中打开'), 'explorer entry missing')
assert.ok(state.rightClick.buttons.includes('复制路径'), 'copy entry missing')
assert.equal(state.rightClick.buttons.some(label => /VS Code|Cursor|IDE/.test(label)), false, 'IDE entries must be removed')
assert.equal(state.rightClick.buttons.includes('在侧栏打开'), false, 'sidebar duplicate must be removed')
assert.equal(state.rightClick.buttons.includes('取消'), false, 'cancel entry must be removed')
assert.equal(state.rightClick.lastIde, null, 'context menu must not launch an external IDE')
assert.equal(state.rightClick.menuClosed, true, 'context menu must close after selecting an action')
assert.ok(state.footer !== null && state.footer.items > 0, `references footer missing: ${JSON.stringify(state.footer)}`)
ws.close()
console.log('ux-probe: OK (left=DSH window, right=explorer/copy, footer folds)')
process.exit(0)

