// Probe the scrollable / collapsible reference footer and command insertion fallback.
import { strict as assert } from 'node:assert'
const token = process.argv[2]
assert.ok(token, 'usage: node test/probe-footer.mjs <token>')
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
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails !== undefined) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'evaluate failed')
  }
  return result.result?.value
}
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
  const footer = document.querySelector('[data-coderef-refs]')
  if (footer === null) return { missing: true }
  footer.open = true
  await new Promise(r => setTimeout(r, 200))
  const body = footer.querySelector('.dcr-refs-body')
  const groups = [...footer.querySelectorAll('.dcr-ref-group')]
  const style = body === null ? null : getComputedStyle(body)
  const beforeToggle = groups.map(group => group.hasAttribute('open'))
  const firstSummary = groups[0]?.querySelector('summary')
  firstSummary?.click()
  await new Promise(r => setTimeout(r, 120))
  const afterToggle = groups.map(group => group.hasAttribute('open'))
  firstSummary?.click()
  const commandGroup = [...footer.querySelectorAll('.dcr-ref-group')].find(group => (group.querySelector('.dcr-ref-group-summary')?.textContent || '').includes('命令'))
  if (commandGroup !== undefined) commandGroup.open = true
  const commandButton = commandGroup?.querySelector('button.dcr-command-row')
  const commandText = commandButton?.textContent ?? null
  const bodyCommandChips = document.querySelectorAll('[data-coderef-command]').length
  const parsedCommand = window.__dshCoderefRenderer.parseCoderefHref('coderef:cmd:node%20test%2Fsmoke.mjs')
  const parsedSymbol = window.__dshCoderefRenderer.parseCoderefHref('coderef:sym:AssistantNodeView')
  const parsedFile = window.__dshCoderefRenderer.parseCoderefHref('coderef:lib/index.js#L1216')
  const matcher = window.__dshCoderefRenderer.createTextMatcher({
    refs: { commands: commandText === null ? [] : [{ command: commandText, visible: true }] },
  }, 'D:/repo', {}, () => {})
  const commandMentions = commandText === null ? [] : matcher.match('before ' + commandText + ' after')
  const sessionId = window.__dshCoderefRenderer.lastResolve?.sessionId
  const written = []
  window.__dshCoderefRenderer.terminalServices = {
    right: {
      openTab() {},
      openTabs: { getSnapshot: () => [{ id: 't1', contentId: 'c1', kind: 'terminal', sessionId }] },
    },
    terminals: {
      view: () => ({
        state: { getSnapshot: () => ({ writable: true }) },
        write: (command) => { written.push(command) },
      }),
    },
  }
  commandButton?.click()
  await new Promise(r => setTimeout(r, 500))
  const toast = document.querySelector('[data-coderef-toast]')
  return {
    summary: footer.querySelector('summary')?.textContent ?? null,
    maxHeight: style?.maxHeight ?? null,
    overflowY: style?.overflowY ?? null,
    scrollable: body !== null && body.scrollHeight > body.clientHeight,
    groups: groups.map(group => group.querySelector('.dcr-ref-group-summary')?.textContent ?? ''),
    beforeToggle,
    afterToggle,
    commandText,
    bodyCommandChips,
    parsedCommand,
    parsedSymbol,
    parsedFile,
    commandMentions: commandMentions.map(mention => ({ kind: mention.kind, label: mention.label })),
    written,
    toast: toast?.textContent ?? null,
    lastTerminal: window.__dshCoderefRenderer?.lastTerminal ?? null,
  }
})()`)
console.log(JSON.stringify(state, null, 2))
assert.equal(state.missing, undefined, 'references footer missing')
assert.ok(state.summary.includes('文件'), `footer summary missing files: ${state.summary}`)
assert.equal(state.maxHeight, '320px', `footer must have a fixed height body: ${state.maxHeight}`)
assert.equal(state.overflowY, 'auto', `footer body must scroll: ${state.overflowY}`)
assert.equal(state.scrollable, true, 'footer content should overflow its fixed height')
assert.ok(state.groups.some(text => text.includes('文件')), `file category missing: ${JSON.stringify(state.groups)}`)
assert.ok(state.groups.some(text => text.includes('命令')), `command category missing: ${JSON.stringify(state.groups)}`)
assert.deepEqual(state.beforeToggle.slice(0, 1), [true], 'category should start open')
assert.deepEqual(state.afterToggle.slice(0, 1), [false], 'category should collapse')
assert.ok(state.commandText !== null && state.commandText.length > 0, 'command row missing')
assert.ok(state.bodyCommandChips >= 1, `assistant-suggested command chip missing: ${state.bodyCommandChips}`)
assert.deepEqual(state.parsedCommand, { kind: 'command', command: 'node test/smoke.mjs' }, `command href parser failed: ${JSON.stringify(state.parsedCommand)}`)
assert.deepEqual(state.parsedSymbol, { kind: 'symbol', name: 'AssistantNodeView' }, `symbol href parser failed: ${JSON.stringify(state.parsedSymbol)}`)
assert.equal(state.parsedFile.kind, 'file')
assert.equal(state.parsedFile.file, 'lib/index.js')
assert.equal(state.parsedFile.line, 1216)
assert.deepEqual(state.commandMentions.map(mention => mention.kind), ['command'], `command matcher missing: ${JSON.stringify(state.commandMentions)}`)
assert.equal(state.written.length, 1, `command must be written to the terminal: ${JSON.stringify(state.written)}`)
assert.equal(state.written[0].endsWith('\n'), false, 'command must be written without Enter')
assert.equal(state.toast, '已填入侧边栏终端（未执行）', `terminal toast missing: ${JSON.stringify(state.toast)}`)
assert.equal(state.lastTerminal?.mode, 'terminal', `terminal insertion mode missing: ${JSON.stringify(state.lastTerminal)}`)
assert.ok(state.lastTerminal !== null, 'command click should record terminal insertion state')
assert.equal(errors.length, 0, `console errors: ${JSON.stringify(errors)}`)
ws.close()
console.log('footer-probe: OK (fixed-height scroll, collapsible categories, command terminal injection)')
process.exit(0)

