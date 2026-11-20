// Smoke test for the fork client bundle: ModuleLoader registration + slot shadow.
import { strict as assert } from 'node:assert'

const React = {
  Component: class Component { constructor(props) { this.props = props } },
  Fragment: Symbol('Fragment'),
  createElement: (type, props, ...children) => ({ type, props, children }),
  memo: fn => fn,
  useEffect: () => {},
  useMemo: fn => fn(),
  useRef: value => ({ current: value }),
  useState: value => [value, () => {}],
}
const jsxRuntime = {
  Fragment: React.Fragment,
  jsx: React.createElement,
  jsxs: React.createElement,
}
const primitives = {
  CodeBlock: () => null,
  DisclosureRow: () => null,
  IconThinkOutline14: () => null,
  LinkIcon: () => null,
  classifyLinkPath: () => 'other',
  MarkdownText: () => null,
}

let registration
globalThis.document = {
  createElement: () => {
    const element = { innerHTML: '', textContent: '', id: '', setAttribute() {}, appendChild() {} }
    return element
  },
  head: { appendChild() {} },
  querySelector: () => null,
  querySelectorAll: () => [],
}
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      registration = entry
    },
  },
}

await import('../lib/client.js')
assert.ok(registration !== undefined, 'bundle must register through ModuleLoader')
assert.equal(registration.id, 'dsh-coderef-renderer')

const exportsOfBundle = registration.factory(specifier => {
  if (specifier === 'react') return React
  if (specifier === 'react/jsx-runtime') return jsxRuntime
  if (specifier === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  throw new Error(`unexpected require(${JSON.stringify(specifier)})`)
})

assert.equal(typeof exportsOfBundle.apply, 'function')
assert.deepEqual(exportsOfBundle.inject, ['slots'])
assert.equal(exportsOfBundle.version, '0.1.0-fork')

// apply() must register a priority -100 assistant-step shadow and report mounted.
const seen = []
const ctx = {
  slots: {
    inject(name, callback) {
      seen.push({ injected: name })
      return callback()
    },
    register(options) {
      seen.push({ options })
      return () => {}
    },
  },
  effect(fn) {
    return fn()
  },
  get() {
    return undefined
  },
}
exportsOfBundle.apply(ctx)
const occupant = seen.find(entry => entry.options !== undefined)
assert.ok(occupant !== undefined, 'apply must register a slot occupant')
assert.equal(occupant.options.name, 'conversation.chat.node')
assert.equal(occupant.options.key, 'assistant-step')
assert.equal(occupant.options.priority, -100)
assert.equal(occupant.options.locale, 'chat')
assert.equal(globalThis.window.__dshCoderefRenderer?.mounted, true)

console.log('renderer-smoke: OK (fork bundle registration, slot shadow, version)')
