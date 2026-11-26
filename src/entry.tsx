/**
 * dsh-coderef-renderer — fork build.
 *
 * Client half that shadows `conversation.chat.node[assistant-step]` (priority
 * -100) and renders the assistant Markdown with a local fork of the DSH
 * `MarkdownText` pipeline (mdast grammar + incremental streaming + render.tsx),
 * extended with coderef hooks:
 *
 *   - inline code  -> native file-mention chip, resolved through /coderef/resolve
 *   - **strong**   -> reference chip for resolved symbols
 *   - coderef:...  -> link chip that opens the source location
 *
 * The stock renderer stays registered at priority 0 as a slot fallback.
 *
 * @module dsh-coderef-renderer/client
 */
import { Component, createElement, Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DisclosureRow, IconCopyOutline16, IconFolderOpenOutline16, IconThinkOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { MarkdownText } from './fork/MarkdownText.tsx'
import type { MarkdownCommandMentions, MarkdownFileMentions, MarkdownLabels, MarkdownTextMentions, TextMention } from './fork/render.tsx'
import { STYLES } from './styles.ts'

const PLUGIN_ID = 'dsh-coderef-renderer'
const API_PREFIX = '/coderef'
const VERSION = '0.1.0-fork'
const SLOT_PRIORITY = -100
const EMPTY_MAP = new Map<string, any>()

/** Debug surface: window.__dshCoderefRenderer. */
const debug: any = {
  version: VERSION,
  mounted: false,
  renders: 0,
  lastError: null,
  lastResolve: null,
  lastOpen: null,
  lastIde: null,
  lastReveal: null,
  lastTerminal: null,
  lastPing: null,
}
if (typeof window !== 'undefined') {
  (window as any).__dshCoderefRenderer = debug
  debug.createTextMatcher = createTextMatcher
  debug.fillTerminalInput = fillTerminalInput
  debug.parseCoderefHref = parseCoderefHref
}

let clientCtx: any = null

/** Resolve the current Session id from the client services. */
function resolveCurrentSessionId(): string | undefined {
  if (clientCtx === null) return undefined
  const get = (name: string): any => {
    try {
      return typeof clientCtx.get === 'function' ? clientCtx.get(name) : undefined
    } catch {
      return undefined
    }
  }
  try {
    const selected = get('uiWorkspace')?.selection?.getSnapshot?.()
    if (typeof selected?.sessionId === 'string' && selected.sessionId !== '') return selected.sessionId
  } catch { /* ignore */ }
  try {
    const binding = get('uiSession')?.adapter?.current?.getSnapshot?.()
    if (typeof binding?.key === 'string' && binding.key !== '') return binding.key
  } catch { /* ignore */ }
  try {
    const snapshot = get('sessions')?.list?.getSnapshot?.()
    const byId = snapshot?.byId
    if (byId !== null && typeof byId === 'object') {
      for (const id of Object.keys(byId)) {
        const retained = byId[id]?.retainedBy
        if (retained !== undefined && retained !== null && retained.mainView > 0) return id
      }
    }
  } catch { /* ignore */ }
  return undefined
}

/** Best-effort locale lookup with a fallback for renderer chrome copy. */
function translate(t: any, key: string, fallback: string): string {
  try {
    const value = typeof t === 'function' ? t(key) : undefined
    if (typeof value === 'string' && value.length > 0) return value
  } catch { /* ignore */ }
  return fallback
}

// ───────────────────────── styles ─────────────────────────
const STYLE_ID = 'dsh-coderef-renderer-style'
let stylesInstalled = false

function ensureStyles(): void {
  if (stylesInstalled || typeof document === 'undefined') return
  stylesInstalled = true
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES
  document.head.appendChild(style)
}

// ───────────────────────── resolve caches ─────────────────────────
const TOKEN_TTL_MS = 5 * 60 * 1000
const tokenCache = new Map<string, { item: any; at: number }>()

function cacheKey(sessionId: string | undefined, cwd: string | undefined, text: string): string {
  return `${sessionId ?? ''}|${cwd ?? ''}|${text}`
}
function cachedItem(sessionId: string | undefined, cwd: string | undefined, text: string): any {
  const entry = tokenCache.get(cacheKey(sessionId, cwd, text))
  if (entry === undefined) return undefined
  if (Date.now() - entry.at > TOKEN_TTL_MS) {
    tokenCache.delete(cacheKey(sessionId, cwd, text))
    return undefined
  }
  // A miss from an early workspace-index build must not latch forever: retry
  // unresolved/ambiguous tokens on the next pass instead of serving stale
  // "unresolved" results for five minutes.
  if (entry.item?.status !== 'linked') {
    tokenCache.delete(cacheKey(sessionId, cwd, text))
    return undefined
  }
  return entry.item
}
function rememberItem(sessionId: string | undefined, cwd: string | undefined, text: string, item: any): void {
  if (tokenCache.size > 600) {
    const first = tokenCache.keys().next()
    if (!first.done) tokenCache.delete(first.value)
  }
  tokenCache.set(cacheKey(sessionId, cwd, text), { item, at: Date.now() })
}

async function postJson(path: string, body: any): Promise<any> {
  const response = await fetch(API_PREFIX + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

/**
 * One shared `/refs` channel per session/cwd. Every assistant-step renderer
 * subscribes to the same channel, so a conversation with N completed steps
 * still performs one poll per interval instead of N polls.
 */
interface LedgerChannel {
  data: any
  listeners: Set<(data: any) => void>
  timer: any
  inflight: boolean
}

const ledgerChannels = new Map<string, LedgerChannel>()

function subscribeLedger(
  sessionId: string,
  cwd: string,
  listener: (data: any) => void,
): () => void {
  const key = `${sessionId}\u0000${cwd}`
  let channel = ledgerChannels.get(key)
  if (channel === undefined) {
    channel = { data: null, listeners: new Set(), timer: null, inflight: false }
    ledgerChannels.set(key, channel)
  }
  channel.listeners.add(listener)
  if (channel.data !== null) listener(channel.data)
  if (channel.timer === null) {
    const active = channel
    const load = async (): Promise<void> => {
      if (active.inflight) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      active.inflight = true
      try {
        const since = active.data === null ? '' : `&since=${encodeURIComponent(String(active.data.version ?? ''))}`
        const response = await fetch(`${API_PREFIX}/refs?sessionId=${encodeURIComponent(sessionId)}&cwd=${encodeURIComponent(cwd)}${since}`)
        const data = await response.json()
        if (data?.ok !== true) return
        debug.refsRequests = (debug.refsRequests ?? 0) + 1
        if (data.unchanged === true) return
        debug.lastLedger = data.stats ?? null
        if (active.data !== null && active.data.version === data.version) return
        active.data = data
        for (const target of [...active.listeners]) target(data)
      } catch (error: any) {
        debug.lastError = String(error?.message ?? error)
      } finally {
        active.inflight = false
      }
    }
    active.timer = setInterval(() => { void load() }, 5000)
    void load()
  }
  return () => {
    const active = ledgerChannels.get(key)
    if (active === undefined) return
    active.listeners.delete(listener)
    if (active.listeners.size > 0) return
    if (active.timer !== null) clearInterval(active.timer)
    active.timer = null
    active.data = null
    ledgerChannels.delete(key)
  }
}

/** Resolve all requested tokens through the dsh-coderef Host. */
async function resolveTokens({ cwd, sessionId, bold, inline }: {
  cwd: string | undefined
  sessionId: string | undefined
  bold: string[]
  inline: string[]
}): Promise<Map<string, any>> {
  const items = new Map<string, any>()
  const missingBold: string[] = []
  const missingInline: string[] = []
  for (const text of bold) {
    const cached = cachedItem(sessionId, cwd, text)
    if (cached === undefined) missingBold.push(text)
    else items.set(text, cached)
  }
  for (const text of inline) {
    const cached = cachedItem(sessionId, cwd, text)
    if (cached === undefined) missingInline.push(text)
    else items.set(text, cached)
  }
  if (missingBold.length === 0 && missingInline.length === 0) return items
  const result = await postJson('/resolve', {
    cwd,
    sessionId,
    texts: missingBold,
    inlineTexts: missingInline,
    hints: [],
    relativeHints: [],
  })
  for (const item of Array.isArray(result.items) ? result.items : []) {
    if (item === null || typeof item !== 'object' || typeof item.text !== 'string') continue
    rememberItem(sessionId, cwd, item.text, item)
    items.set(item.text, item)
  }
  const values = [...items.values()]
  debug.lastResolve = {
    cwd,
    sessionId: sessionId ?? null,
    bold: bold.length,
    inline: inline.length,
    requested: missingBold.length + missingInline.length,
    hits: values.filter(item => item.status === 'linked').length,
    inlineLinked: values.filter(item => item.kind === 'inline' && item.status === 'linked').length,
    statusCounts: result.statusCounts ?? null,
    evidence: result.evidence ?? null,
  }
  return items
}

// ───────────────────────── open / ping ─────────────────────────
const PING_CLASS = 'dsh-coderef-line-ping'
let pingGeneration = 0

function findPreviewRows(line: number, endLine: number): Array<{ row: HTMLElement; container: HTMLElement }> {
  const rows: Array<{ row: HTMLElement; container: HTMLElement }> = []
  const last = Math.max(line, endLine)
  for (const pane of document.querySelectorAll<HTMLElement>('[data-code-preview], [data-document-preview]')) {
    if (pane.getClientRects().length === 0) continue
    const codeLines = pane.querySelectorAll<HTMLElement>('pre .line')
    if (codeLines.length === 0) continue
    const container = pane.querySelector<HTMLElement>('[data-code-block-content]') ?? pane
    for (let index = line - 1; index < Math.min(last, line - 1 + 200) && index < codeLines.length; index += 1) {
      rows.push({ row: codeLines[index]!, container })
    }
    if (rows.length > 0) return rows
  }
  for (let current = line; current <= last; current += 1) {
    const row = document.querySelector<HTMLElement>(`[data-textpreview-line="${current}"]`)
    if (row !== null && row.getClientRects().length > 0) {
      rows.push({ row, container: (row.closest<HTMLElement>('[data-textpreview-state="text"]') ?? row.parentElement)! })
    }
  }
  return rows
}

function pingLine(line: number, endLine?: number): void {
  if (typeof document === 'undefined' || !Number.isFinite(line)) return
  ensureStyles()
  const generation = (pingGeneration += 1)
  const start = Math.max(1, Math.floor(line))
  const end = Number.isFinite(endLine) ? Math.max(start, Math.floor(endLine!)) : start
  const deadline = Date.now() + 6000
  const clearers = new Set<HTMLElement>()
  let applied = false
  const attempt = (): void => {
    if (generation !== pingGeneration) return
    const rows = findPreviewRows(start, Math.min(end, start + 200))
    if (rows.length === 0) {
      if (Date.now() < deadline) setTimeout(attempt, 120)
      return
    }
    if (!applied) {
      applied = true
      const container = rows[0]!.container
      const top = Math.max(0, rows[0]!.row.offsetTop - container.clientHeight * 0.35)
      try {
        container.scrollTo({ top, behavior: 'smooth' })
      } catch {
        container.scrollTop = top
      }
      debug.lastPing = { line: start, end, rows: rows.length, at: Date.now() }
    }
    // Keep re-applying while the preview may still be mounting/re-rendering:
    // React can replace the row element right after the first paint.
    for (const { row } of rows) {
      row.classList.add(PING_CLASS)
      if (!clearers.has(row)) {
        clearers.add(row)
        setTimeout(() => {
          row.classList.remove(PING_CLASS)
          clearers.delete(row)
        }, 2600)
      }
    }
    if (Date.now() < deadline) setTimeout(attempt, 150)
  }
  attempt()
}

/** Broadcast open progress so every entry point can show one shared spinner. */
const OPEN_PROGRESS_EVENT = 'dsh-coderef:open-progress'
const OPEN_FEEDBACK_MIN_MS = 350

function emitOpenProgress(active: boolean, file: string, line?: number): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(OPEN_PROGRESS_EVENT, { detail: { active, file, line } }))
  } catch { /* non-browser test double */ }
}

/** Left click: sidebar preview + line ping only. IDE is an explicit context-menu action. */
async function openReference(props: any, hit: any): Promise<void> {
  const file = hit.file
  const line = hit.line
  const startedAt = Date.now()
  let previewOpened = false
  emitOpenProgress(true, file, line)
  // Let React paint the spinner before the sidebar starts reading the file.
  await new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
  try {
    if (typeof props?.openFile === 'function') {
      await props.openFile(file, { line })
      previewOpened = true
      pingLine(line, hit.endLine)
    }
  } catch (error: any) {
    debug.lastError = String(error?.message ?? error)
  } finally {
    // Keep the spinner visible long enough to read even when the preview stub
    // resolves immediately; the user should never see a dead click.
    const remaining = OPEN_FEEDBACK_MIN_MS - (Date.now() - startedAt)
    if (remaining > 0) await new Promise<void>(resolve => setTimeout(resolve, remaining))
    emitOpenProgress(false, file, line)
  }
  debug.lastOpen = { file, line, previewOpened, ideOpened: false, at: Date.now() }
}

/** Reveal the file in the OS file manager. */
async function revealInExplorer(hit: any): Promise<void> {
  try {
    const result = await postJson('/reveal', { file: hit.file })
    debug.lastReveal = {
      file: hit.file,
      ok: result?.ok === true,
      error: typeof result?.error === 'string' ? result.error : null,
      at: Date.now(),
    }
  } catch (error: any) {
    debug.lastError = String(error?.message ?? error)
  }
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** Clipboard write with a textarea fallback for non-secure/headless contexts. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Clipboard writes are permitted only to a focused document; a rejected
    // attempt also leaves a noisy console error in headless automation.
    if (document.hasFocus()) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the textarea copy */ }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * Fill a command into the right-sidebar terminal *without submitting*.
 * Uses the optional DSH terminal services when the sidebar-terminal plugin is
 * loaded; otherwise falls back to copying the command.
 */
async function fillTerminalInput(command: string): Promise<'terminal' | 'clipboard' | 'failed'> {
  const text = command.replace(/\r/g, '').replace(/\n+$/g, '')
  if (text === '' || text.includes('\n')) {
    return (await copyToClipboard(command)) ? 'clipboard' : 'failed'
  }
  const terminals = debug.terminalServices?.terminals ?? clientCtx?.get?.('webTerminals')
  const right = debug.terminalServices?.right ?? clientCtx?.get?.('sidebarRight')
  const sessionId = resolveCurrentSessionId()
  if (terminals !== undefined && terminals !== null && right !== undefined && right !== null && sessionId !== undefined) {
    try {
      const tabs = (): any[] => {
        try {
          const snapshot = right.openTabs?.getSnapshot?.()
          return Array.isArray(snapshot) ? snapshot : []
        } catch { return [] }
      }
      let tab = tabs().find((candidate: any) => candidate?.kind === 'terminal' && candidate?.sessionId === sessionId)
      if (tab === undefined) {
        right.openTab?.('terminal', { replaceTab: false })
        await sleep(250)
        tab = tabs().find((candidate: any) => candidate?.kind === 'terminal' && candidate?.sessionId === sessionId)
      }
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (tab !== undefined) {
          try {
            const view = terminals.view?.(sessionId, tab.id, tab.contentId, tab.terminalId, undefined)
            const state = view?.state?.getSnapshot?.()
            if (state?.writable === true && typeof view.write === 'function') {
              view.write(text)
              debug.lastTerminal = { command: text, mode: 'terminal', tabId: tab.id, at: Date.now() }
              return 'terminal'
            }
          } catch { /* keep waiting for the terminal attachment */ }
        }
        await sleep(100)
        tab = tabs().find((candidate: any) => candidate?.kind === 'terminal' && candidate?.sessionId === sessionId)
      }
    } catch { /* fall through to the clipboard */ }
  }
  try {
    if (await copyToClipboard(command)) {
      debug.lastTerminal = { command, mode: 'clipboard', at: Date.now() }
      return 'clipboard'
    }
    debug.lastTerminal = { command, mode: 'failed', at: Date.now() }
    return 'failed'
  } catch {
    debug.lastTerminal = { command, mode: 'failed', at: Date.now() }
    return 'failed'
  }
}

// ───────────────────────── token extraction ─────────────────────────
const CANDIDATE_PATTERN = /\*\*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\*\*/g
const BOLD_BLACKLIST = new Set([
  'important', 'note', 'warning', 'tip', 'todo', 'fixme', 'danger', 'caution', 'hint',
  'read', 'write', 'edit', 'grep', 'glob', 'bash', 'pwsh', 'shell', 'line', 'file', 'path',
  'true', 'false', 'null', 'undefined', 'return', 'class', 'function', 'interface', 'type',
  'enum', 'const', 'let', 'var', 'async', 'await', 'export', 'import', 'default',
])
const INLINE_PATH_HINT = /[\\/]|\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?$/i
const INLINE_IDENTIFIER = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(\))?$/
const INLINE_BLACKLIST = new Set([
  'node', 'npx', 'pnpm', 'npm', 'git', 'cd', 'stock', 'line', 'seq', 'mentions', 'props',
  'data', 'kind', 'text', 'type', 'value', 'name', 'path', 'file', 'http', 'https',
  'true', 'false', 'null', 'undefined', 'return', 'class', 'function', 'interface',
  'const', 'let', 'var', 'async', 'await',
])

function isBoldCandidate(value: string): boolean {
  if (typeof value !== 'string') return false
  if (value.length < 2 || value.length > 80) return false
  if (BOLD_BLACKLIST.has(value.toLowerCase())) return false
  if (/^[A-Z]{1,2}$/.test(value)) return false
  return true
}

function isInlineCandidate(value: string): boolean {
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (text.length < 3 || text.length > 220) return false
  if (/[*`\n]/.test(text)) return false
  if (/^(?:https?:|mailto:|data:)/i.test(text)) return false
  if (/^(?:node|npx|pnpm|npm|git|cd|echo|curl)\s/.test(text)) return false
  if (INLINE_PATH_HINT.test(text) && !/\s/.test(text)) return true
  if (INLINE_IDENTIFIER.test(text)) {
    if (INLINE_BLACKLIST.has(text.toLowerCase())) return false
    if (/^[A-Z][A-Z0-9_]{1,}$/.test(text) && text.length >= 3) return true
    if (text.length < 3) return false
    if (/[A-Z]/.test(text) || text.includes('.')) return true
  }
  if (text.length > 200 || /^[<{[*#]/.test(text)) return false
  const pathInside = /(?:[A-Za-z]:)?(?:[\w.$@-]+[\\/])*[\w.$@-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?/i.test(text)
  const symbolWithLine = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*:\s*\d+/.test(text)
  const dottedUpper = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+/.test(text) && /[A-Z]/.test(text)
  const callUpper = /\b[A-Za-z_$][\w$]*\s*\(/.test(text) && /[A-Z]/.test(text)
  const pascal = /\b[A-Z][A-Za-z0-9_$]{3,}\b/.test(text)
  return pathInside || symbolWithLine || dottedUpper || callUpper || pascal
}

function collectTokens(blocks: any[]): { bold: string[]; inline: string[] } {
  const bold: string[] = []
  const inline: string[] = []
  const seenBold = new Set<string>()
  const seenInline = new Set<string>()
  const addInline = (value: string): void => {
    const text = value.trim()
    if (seenInline.has(text) || !isInlineCandidate(text)) return
    seenInline.add(text)
    inline.push(text)
  }
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block === null || typeof block !== 'object' || block.kind !== 'text' || typeof block.text !== 'string') continue
    CANDIDATE_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = CANDIDATE_PATTERN.exec(block.text)) !== null) {
      const name = match[1]!
      if (!isBoldCandidate(name) || seenBold.has(name)) continue
      seenBold.add(name)
      bold.push(name)
    }
    const code = /`([^`\n]{2,300})`/g
    while ((match = code.exec(block.text)) !== null) {
      addInline(match[1]!)
      if (inline.length >= 160) break
    }
    // Fenced blocks are rendered by the stock Shiki CodeBlock, which has no
    // mention hook. Collect their identifiers here so the Host resolver can
    // link them, then decorate the rendered code nodes below.
    const fence = /```[^\n]*\n([\s\S]*?)```/g
    while ((match = fence.exec(block.text)) !== null) {
      const identifiers = match[1]!.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? []
      for (const identifier of identifiers) {
        addInline(identifier)
        if (identifier.includes('.')) {
          for (const part of identifier.split('.')) addInline(part)
        }
        if (inline.length >= 160) break
      }
      if (inline.length >= 160) break
    }
    if (bold.length >= 40) break
  }
  return { bold, inline }
}

/** Decorate identifiers already rendered by the stock Shiki CodeBlock. */
function decorateCodeBlocks(
  root: HTMLElement,
  textMentions: MarkdownTextMentions,
  mentions: MarkdownFileMentions,
  hits: Map<string, any>,
): void {
  // Long answers can contain hundreds of code blocks. The resolver only knows
  // the first 160 identifiers anyway, so decorating every block is wasted work.
  const blocks = [...root.querySelectorAll<HTMLElement>('pre code')].slice(0, 24)
  for (const code of blocks) {
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []
    let current = walker.nextNode()
    while (current !== null) {
      const parent = current.parentElement
      if (parent !== null && parent.closest('[data-coderef-chip]') === null) textNodes.push(current as Text)
      current = walker.nextNode()
      if (textNodes.length >= 500) break
    }
    for (const textNode of textNodes) {
      const value = textNode.nodeValue ?? ''
      if (value.length < 2) continue
      const base = textMentions.match(value).filter(mention => mention.kind !== 'command')
      const spans: Array<{ start: number; end: number; label: string; title: string; open?: () => void }> = base.map(mention => ({
        start: mention.start,
        end: mention.end,
        label: mention.label,
        title: mention.title,
        open: mention.open,
      }))
      const covers = (start: number, end: number): boolean => spans.some(span => start < span.end && end > span.start)
      const tokenPattern = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g
      let token: RegExpExecArray | null
      while ((token = tokenPattern.exec(value)) !== null) {
        const start = token.index
        const end = start + token[0].length
        if (covers(start, end)) continue
        const mention = mentions.resolve(token[0])
        if (mention !== undefined && hits.has(token[0])) {
          spans.push({ start, end, label: mention.label, title: mention.title, open: mention.open })
          continue
        }
        // Dotted chains often appear as `PCM.TryFilterLookInput` in a diagram.
        // Link the resolvable head/tail segments even when the full chain is
        // not a symbol in the source index.
        let offset = 0
        for (const part of token[0].split('.')) {
          const partStart = start + offset
          const partEnd = partStart + part.length
          offset += part.length + 1
          if (part.length < 2 || covers(partStart, partEnd) || !hits.has(part)) continue
          const segment = mentions.resolve(part)
          if (segment === undefined) continue
          spans.push({ start: partStart, end: partEnd, label: segment.label, title: segment.title, open: segment.open })
        }
      }
      if (spans.length === 0) continue
      spans.sort((a, b) => a.start - b.start || b.end - a.end)
      const fragment = document.createDocumentFragment()
      let cursor = 0
      for (const span of spans) {
        if (span.start < cursor) continue
        if (span.start > cursor) fragment.appendChild(document.createTextNode(value.slice(cursor, span.start)))
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'dcr-code-ref'
        chip.dataset.coderefChip = 'true'
        chip.title = span.title
        chip.textContent = value.slice(span.start, span.end)
        chip.style.cssText = 'display:inline;padding:0;margin:0;border:0;background:none;font:inherit;color:inherit;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;cursor:pointer'
        chip.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          span.open?.()
        })
        fragment.appendChild(chip)
        cursor = span.end
      }
      if (cursor < value.length) fragment.appendChild(document.createTextNode(value.slice(cursor)))
      textNode.parentNode?.replaceChild(fragment, textNode)
    }
  }
}

function formatTitle(hit: any): string {
  const range = hit.endLine !== undefined && Number(hit.endLine) > Number(hit.line)
    ? `${hit.line}-${hit.endLine}`
    : `${hit.line}`
  const kind = typeof hit.kind === 'string' ? ` · ${hit.kind}` : ''
  return `${hit.file}:${range}${kind}`
}

/** Parse `coderef:<path>#L12`, `coderef:sym:Name`, and `coderef:cmd:<encoded command>`. */
function decodeRefPart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseCoderefHref(href: string): any {
  if (!/^coderef:/i.test(href)) return undefined
  const raw = href.slice(href.indexOf(':') + 1).replace(/^\/\//, '')
  if (/^sym:/i.test(raw)) return { kind: 'symbol', name: decodeRefPart(raw.slice(4)) }
  if (/^cmd:/i.test(raw)) return { kind: 'command', command: decodeRefPart(raw.slice(4)) }
  const hashAt = raw.indexOf('#')
  const pathPart = hashAt >= 0 ? raw.slice(0, hashAt) : raw
  const hash = hashAt >= 0 ? raw.slice(hashAt + 1) : ''
  const lineMatch = /^L?(\d+)(?:-L?(\d+))?$/i.exec(hash)
  if (pathPart.length === 0) return undefined
  return {
    kind: 'file',
    file: decodeURIComponent(pathPart),
    line: lineMatch === null ? 1 : Number(lineMatch[1]),
    ...(lineMatch !== null && lineMatch[2] !== undefined ? { endLine: Number(lineMatch[2]) } : {}),
  }
}

// ───────────────────────── prose reference matcher ─────────────────────────
const WEB_URL_RE = /https?:\/\/[^\s<>"'`)\]]+/g
const PATH_TOKEN_RE = /(?:[A-Za-z]:[\\/]|\.{0,2}[\\/])?(?:[\w.$@-]+[\\/])*[\w.$@-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|py|go|rs|java|kt|cs|rb|php|swift|scala|lua|ya?ml|toml)(?::\d+(?:-\d+)?)?/g
const SYMBOL_TOKEN_RE = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g

function normalizeMatchPath(value: string): string {
  return String(value).replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Same normalization as the Host snippet index. */
function normalizeSnippetText(value: string): string {
  return String(value)
    .replace(/\r/g, '')
    .replace(/\/\/.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[;,]\s*$/, '')
    .trim()
}

/** Find a real absolute file already present in the ledger by suffix. */
function knownLedgerFile(needle: string, ledger?: any, relativeOnly = false): string | undefined {
  let known: string | undefined
  for (const ref of ledger?.refs?.files ?? []) {
    if (relativeOnly && typeof ref?.path === 'string' && /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(ref.path)) continue
    const candidate = typeof ref?.absPath === 'string' ? ref.absPath : typeof ref?.path === 'string' ? ref.path : ''
    if (candidate === '') continue
    const normalized = candidate.replace(/\\/g, '/').toLowerCase()
    if (normalized !== needle && !normalized.endsWith(`/${needle}`)) continue
    if (known === undefined || candidate.length < known.length) known = candidate
  }
  return known
}

/** Resolve a coderef-relative file against Session cwd, preferring a real file the ledger already knows. */
function absoluteRefFile(file: string, cwd: string | undefined, ledger?: any): string {
  const normalizedFile = file.replace(/\\/g, '/').replace(/^\.\/+/, '')
  if (cwd === undefined || cwd === '' || /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(file)) {
    // A resolver can still hand back "<cwd>/<relative>" for an external file.
    // If that fabricated absolute path is not itself in the ledger, retry the
    // same suffix against the files the session really touched.
    const root = cwd === undefined ? '' : cwd.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
    const normalized = normalizedFile.toLowerCase()
    if (root !== '' && (normalized === root || normalized.startsWith(`${root}/`))) {
      const rel = normalized === root ? '' : normalized.slice(root.length + 1)
      if (rel !== '') {
        const exact = (ledger?.refs?.files ?? []).some((ref: any) => {
          const candidate = typeof ref?.absPath === 'string' ? ref.absPath : ''
          return candidate.replace(/\\/g, '/').toLowerCase() === normalized
        })
        const known = exact ? undefined : knownLedgerFile(rel, ledger)
        if (known !== undefined) return known
      }
    }
    return file
  }
  const needle = normalizedFile.toLowerCase()
  const known = knownLedgerFile(needle, ledger)
  if (known !== undefined) return known
  const separator = cwd.includes('\\') ? '\\' : '/'
  const relative = file.replace(/^[\\/]+/, '').replace(/[\\/]/g, separator)
  return `${cwd.replace(/[\\/]+$/, '')}${separator}${relative}`
}

function canonicalUrlClient(raw: string): string {
  try {
    const url = new URL(raw)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${path}${url.search}`
  } catch {
    return raw
  }
}

const COMMAND_NAMES = new Set((
  'node npm pnpm yarn npx bun bunx deno corepack python python3 pip pip3 poetry uv pytest conda ' +
  'cargo rustc rustup go dotnet java javac mvn gradle gradlew mvnw git gh docker kubectl helm terraform ansible ' +
  'make cmake gcc g++ clang clang++ tsc tsx esbuild vite webpack rollup ' +
  'npx.cmd npm.cmd pnpm.cmd node.exe python.exe pwsh powershell bash sh zsh cmd ' +
  'curl wget jq rg grep find sed awk cat less more head tail sort uniq wc ' +
  'cd pwd ls dir cp mv rm mkdir rmdir del echo export source touch chmod chown ' +
  'vitest jest playwright cypress eslint prettier biome ' +
  'ssh scp rsync tar unzip zip psql mysql sqlite3 redis-cli mongosh ' +
  'code code-insiders cursor windsurf notepad explorer'
).split(/\s+/))
const BARE_COMMANDS = new Set(['pwd', 'ls', 'dir', 'clear', 'cls', 'whoami', 'date', 'uname', 'env', 'history', 'exit'])
const PS_CMDLET_RE = /^(?:Add|Clear|Close|Connect|Convert|Copy|Disable|Disconnect|Enable|Enter|Exit|Export|Find|ForEach|Format|Get|Group|Hide|Import|Initialize|Install|Invoke|Join|Measure|Mount|Move|New|Open|Out|Pop|Publish|Push|Read|Receive|Register|Remove|Rename|Repair|Reset|Resolve|Restart|Resume|Save|Search|Select|Send|Set|Show|Sort|Split|Start|Stop|Submit|Suspend|Test|Uninstall|Unregister|Update|Use|Wait|Where|Write)-[A-Za-z][\w-]*$/

function normalizeCommandText(raw: string): string {
  return String(raw).trim().replace(/^(?:PS(?: [^>]*)?>|\$|>)\s+/, '').trim()
}

/** Command-like heuristic for commands the assistant recommends to the user. */
function looksLikeCommandText(raw: string): boolean {
  const command = normalizeCommandText(raw)
  if (command === '' || command.length > 300 || command.includes('\n')) return false
  if (/^export\s+(?:const|let|var|function|class|default|type|interface|enum|\{|\*)/.test(command)) return false
  const first = command.split(/\s+/)[0] ?? ''
  const rest = command.slice(first.length).trim()
  const base = first.replace(/^["']|["']$/g, '').split(/[\\/]/).pop()?.toLowerCase() ?? ''
  if (COMMAND_NAMES.has(base)) return rest !== '' || BARE_COMMANDS.has(base)
  if (PS_CMDLET_RE.test(first)) return true
  if (/^(?:[A-Za-z]:[\\/]|\.{1,2}[\\/])/.test(first)
    && /\.(?:exe|cmd|bat|ps1|sh|mjs|js|ts|py)$/i.test(first)) return true
  return false
}

function chooseRef(list: any[]): any {
  return [...list].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]
}

/**
 * Build a synchronous full-token matcher over one ledger snapshot. Matching is
 * case-sensitive and never extracts a symbol out of a longer identifier.
 */
function createTextMatcher(ledger: any, cwd: string | undefined, props: any, runCommand: (command: string) => void): MarkdownTextMentions {
  const fileByAlias = new Map<string, any[]>()
  const symbolByName = new Map<string, any[]>()
  const urlByCanonical = new Map<string, any>()
  const commands: any[] = (ledger?.refs?.commands ?? [])
    .filter((ref: any) => ref.visible === true && typeof ref?.command === 'string' && ref.command.length >= 4)
    .sort((a: any, b: any) => b.command.length - a.command.length)
  const cwdNorm = cwd === undefined ? undefined : normalizeMatchPath(cwd).replace(/\/+$/, '')

  const addFileAlias = (alias: string, ref: any): void => {
    const key = normalizeMatchPath(alias)
    if (key.length < 3) return
    const list = fileByAlias.get(key)
    if (list === undefined) fileByAlias.set(key, [ref])
    else if (!list.includes(ref)) list.push(ref)
  }
  for (const ref of (ledger?.refs?.files ?? []).filter((item: any) => item.visible === true).slice(0, 160)) {
    const absNorm = normalizeMatchPath(ref.absPath ?? ref.path)
    addFileAlias(absNorm, ref)
    addFileAlias(normalizeMatchPath(ref.path), ref)
    if (cwdNorm !== undefined && absNorm.startsWith(`${cwdNorm}/`)) addFileAlias(absNorm.slice(cwdNorm.length + 1), ref)
    for (const alias of ref.aliases ?? []) addFileAlias(alias, ref)
    const parts = absNorm.split('/')
    const basename = parts[parts.length - 1]
    if (basename !== undefined) addFileAlias(basename, ref)
    for (let count = 2; count <= Math.min(4, parts.length); count += 1) addFileAlias(parts.slice(-count).join('/'), ref)
  }
  for (const ref of ledger?.refs?.symbols ?? []) {
    if (ref.visible !== true) continue
    if (typeof ref.name !== 'string') continue
    const list = symbolByName.get(ref.name)
    if (list === undefined) symbolByName.set(ref.name, [ref])
    else list.push(ref)
  }
  for (const ref of ledger?.refs?.urls ?? []) {
    if (typeof ref.canonical === 'string') urlByCanonical.set(ref.canonical, ref)
  }

  const openFileRef = (ref: any, line: number | undefined): void => {
    void openReference(props, {
      file: ref.absPath ?? ref.file ?? ref.path,
      line: line ?? ref.line ?? 1,
      endLine: ref.endLine,
    })
  }

  function resolveFileToken(rawToken: string): { ref: any; line?: number; endLine?: number } | undefined {
    const token = normalizeMatchPath(rawToken)
    const match = /^(.*?)(?::(\d+)(?:-(\d+))?)?$/.exec(token)
    if (match === null) return undefined
    const pathPart = match[1]!
    const list = fileByAlias.get(pathPart)
    if (list === undefined || list.length === 0) return undefined
    return {
      ref: chooseRef(list),
      line: match[2] === undefined ? undefined : Number(match[2]),
      endLine: match[3] === undefined ? undefined : Number(match[3]),
    }
  }

  return {
    match(text: string): TextMention[] {
      const spans: Array<{ start: number; end: number; kind: TextMention['kind']; payload: any; token: string }> = []
      const overlaps = (start: number, end: number): boolean => spans.some(span => start < span.end && end > span.start)

      WEB_URL_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = WEB_URL_RE.exec(text)) !== null) {
        const raw = match[0].replace(/[.,;:!?，。；：！？)）"'`\]]+$/g, '')
        const start = match.index
        const end = start + raw.length
        if (end <= start) continue
        const urlRef = urlByCanonical.get(canonicalUrlClient(raw))
        spans.push({ start, end, kind: 'url', payload: { url: raw, ref: urlRef }, token: raw })
      }
      for (const command of commands) {
        let index = text.indexOf(command.command)
        while (index >= 0) {
          const start = index
          const end = start + command.command.length
          const before = start > 0 ? text[start - 1]! : ''
          const after = end < text.length ? text[end]! : ''
          const blockedBefore = before !== '' && /[\w$/\\-]/.test(before)
          const blockedAfter = after !== '' && /[\w$/\\-]/.test(after)
          if (!blockedBefore && !blockedAfter && !overlaps(start, end)) {
            spans.push({ start, end, kind: 'command', payload: command, token: command.command })
          }
          index = text.indexOf(command.command, index + 1)
        }
      }
      PATH_TOKEN_RE.lastIndex = 0
      while ((match = PATH_TOKEN_RE.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (start > 0 && /[\w$]/.test(text[start - 1]!)) continue
        if (end < text.length && /[\w$]/.test(text[end]!)) continue
        if (overlaps(start, end)) continue
        const resolved = resolveFileToken(match[0])
        if (resolved === undefined) continue
        spans.push({ start, end, kind: 'file', payload: resolved, token: match[0] })
      }
      SYMBOL_TOKEN_RE.lastIndex = 0
      while ((match = SYMBOL_TOKEN_RE.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (overlaps(start, end)) continue
        if (start > 0 && /[\w$/\\]/.test(text[start - 1]!)) continue
        const list = symbolByName.get(match[0])
        if (list === undefined || list.length === 0) continue
        spans.push({ start, end, kind: 'symbol', payload: chooseRef(list), token: match[0] })
      }

      spans.sort((a, b) => a.start - b.start || b.end - a.end)
      const mentions: TextMention[] = []
      let cursor = 0
      for (const span of spans) {
        if (span.start < cursor) continue
        let title = ''
        let open: () => void
        if (span.kind === 'url') {
          const url = span.payload.url as string
          title = span.payload.ref?.title !== undefined ? `${span.payload.ref.title} · ${url}` : url
          open = () => {
            if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
          }
        } else if (span.kind === 'command') {
          const command = span.payload.command as string
          title = `命令 · 点击填入终端（不执行）`
          open = () => runCommand(command)
        } else if (span.kind === 'file') {
          const ref = span.payload.ref
          const line = span.payload.line ?? ref.lines?.[0]?.start ?? 1
          title = `${ref.absPath ?? ref.path}:${line}` + (ref.occurrences?.length > 1 ? ` · ${ref.occurrences.length} 次` : '')
          open = () => openFileRef(ref, line)
        } else {
          const ref = span.payload
          title = `${ref.name} · ${ref.absPath ?? ref.file}:${ref.line ?? 1}`
          open = () => openFileRef(ref, ref.line)
        }
        const targetFile = span.kind === 'file'
          ? (span.payload.ref.absPath ?? span.payload.ref.path)
          : span.kind === 'symbol'
            ? (span.payload.absPath ?? span.payload.file)
            : undefined
        const targetLine = span.kind === 'file'
          ? (span.payload.line ?? span.payload.ref.lines?.[0]?.start)
          : span.kind === 'symbol'
            ? span.payload.line
            : undefined
        mentions.push({
          start: span.start,
          end: span.end,
          label: text.slice(span.start, span.end),
          title,
          kind: span.kind,
          href: span.kind === 'url' ? span.payload.url : undefined,
          file: targetFile,
          line: targetLine,
          endLine: span.kind === 'file' ? span.payload.endLine : span.kind === 'symbol' ? span.payload.endLine : undefined,
          command: span.kind === 'command' ? span.payload.command : undefined,
          open,
        })
        cursor = span.end
      }
      return mentions
    },
  }
}

// ───────────────────────── reasoning row ─────────────────────────
function firstLine(text: string): string {
  const newline = text.indexOf('\n')
  return newline === -1 ? text : text.slice(0, newline)
}
function latestLine(text: string): string {
  const visible = text.trimEnd()
  const newline = visible.lastIndexOf('\n')
  return newline === -1 ? visible : visible.slice(newline + 1)
}

function ReasoningBlock({ text, running, t }: { text: string; running: boolean; t: any }): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const source = running ? latestLine(text) : firstLine(text)
  const summary = String(source ?? '').replaceAll('**', '')
  const label = translate(t, 'message.think', '思考')
  const body = createElement('div', { className: 'dcr-think-body' }, text)
  if (DisclosureRow === undefined) {
    return createElement('details', { className: 'dcr-reasoning' },
      createElement('summary', null, label),
      body)
  }
  return createElement('div', {
    className: 'dcr-reasoning',
    'data-variant': 'think',
    'data-state': running ? 'running' : 'ok',
    ...(expanded ? { 'data-expanded': 'true' } : {}),
  },
  createElement(DisclosureRow as any, {
    rowClassName: 'dcr-reasoning-row',
    leadingClassName: 'dcr-reasoning-leading',
    titleClassName: 'dcr-reasoning-title',
    chevronClassName: 'dcr-reasoning-chevron',
    icon: IconThinkOutline14 !== undefined ? createElement(IconThinkOutline14 as any, { size: 14 }) : null,
    title: label,
    open: expanded,
    expandable: true,
    expandOnRowClick: true,
    onToggle: () => setExpanded(value => !value),
    collapsedContent: createElement(Fragment, null,
      createElement('span', { className: 'dcr-reasoning-separator', 'aria-hidden': 'true' }),
      createElement('span', { className: 'dcr-reasoning-summary' },
        createElement('span', { className: 'dcr-reasoning-summary-text' }, summary))),
  }, body))
}

// ───────────────────────── session references footer ─────────────────────────
function relativeForFooter(absPath: string, cwd: string | undefined): string {
  const normalized = normalizeMatchPath(absPath)
  if (cwd === undefined) return normalized
  const root = normalizeMatchPath(cwd).replace(/\/+$/, '')
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
}

/** Right-click menu: native DSH Menu; external IDEs are intentionally absent. */
function ReferenceMenu({ menu, props, onClose }: { menu: any; props: any; onClose: () => void }): ReactNode {
  if (menu === null) return null
  const width = 240
  const left = Math.max(8, Math.min(menu.x, (typeof window === 'undefined' ? 1200 : window.innerWidth) - width - 8))
  const top = Math.max(8, Math.min(menu.y, (typeof window === 'undefined' ? 800 : window.innerHeight) - 120))
  const items: any[] = [
    { id: 'explorer', label: '在资源管理器中打开', icon: createElement(IconFolderOpenOutline16 as any, { size: 16 }) },
    { type: 'separator', id: 's1' },
    { id: 'copy', label: '复制路径', icon: createElement(IconCopyOutline16 as any, { size: 16 }) },
  ]
  const onSelect = (id: string): void => {
    if (id === 'explorer') {
      void revealInExplorer({ file: menu.file })
    } else if (id === 'copy') {
      void copyToClipboard(`${menu.file}:${menu.line ?? 1}`)
    }
    onClose()
  }
  return createElement('span', { 'data-coderef-menu': 'true' },
    createElement(Menu as any, {
      open: true,
      autoFocus: true,
      portal: true,
      dense: true,
      compact: true,
      align: 'start',
      side: 'bottom',
      anchor: createElement('span', { style: { position: 'fixed', left, top, width: 0, height: 0 } }),
      getAnchorRect: () => new DOMRect(left, top, 0, 0),
      items,
      onSelect,
      onClose,
    }))
}

function commandDisplayLabel(command: string): string {
  const firstLine = command.split('\n')[0] ?? command
  return firstLine.length > 96 ? `${firstLine.slice(0, 93)}…` : firstLine
}

/** Inline vector icons: no ASCII glyphs, so every row shares one optical size. */
function svgIcon(className: string, paths: ReactNode[]): ReactNode {
  return createElement('svg', {
    className,
    viewBox: '0 0 16 16',
    width: 14,
    height: 14,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  }, ...paths)
}

function CodeRefIcon(): ReactNode {
  return svgIcon('dcr-ref-icon', [
    createElement('path', { key: 'left', d: 'M5.1 4.3 1.9 8l3.2 3.7' }),
    createElement('path', { key: 'right', d: 'm10.9 4.3 3.2 3.7-3.2 3.7' }),
    createElement('path', { key: 'slash', d: 'M9.2 2.8 6.8 13.2' }),
  ])
}

function FileRefIcon(): ReactNode {
  return svgIcon('dcr-ref-icon', [
    createElement('path', { key: 'page', d: 'M4 1.9h5.1L12 4.8v9.3H4z' }),
    createElement('path', { key: 'fold', d: 'M9.1 1.9v3h2.9' }),
  ])
}

function TerminalRefIcon(): ReactNode {
  return svgIcon('dcr-ref-icon', [
    createElement('rect', { key: 'frame', x: 1.8, y: 2.8, width: 12.4, height: 10.4, rx: 2.2 }),
    createElement('path', { key: 'prompt', d: 'm4.7 6 2.1 2-2.1 2' }),
    createElement('path', { key: 'cursor', d: 'M8.9 10h2.7' }),
  ])
}

function LinkRefIcon(): ReactNode {
  return svgIcon('dcr-ref-icon', [
    createElement('path', { key: 'box', d: 'M9.2 2.7h4.1v4.1' }),
    createElement('path', { key: 'arrow', d: 'm13.2 2.8-5.6 5.6' }),
    createElement('path', { key: 'tail', d: 'M11.3 9.1v3.1H2.8V3.9h3.1' }),
  ])
}

function ChevronRefIcon(): ReactNode {
  return svgIcon('dcr-ref-chevron', [
    createElement('path', { key: 'chevron', d: 'm6 3.5 4.5 4.5L6 12.5' }),
  ])
}

function SpinnerRefIcon(): ReactNode {
  return svgIcon('dcr-ref-spinner', [
    createElement('circle', { key: 'track', cx: 8, cy: 8, r: 5.4, opacity: 0.25 }),
    createElement('path', { key: 'arc', d: 'M8 2.6a5.4 5.4 0 0 1 5.4 5.4' }),
  ])
}

/** Pick an icon by reference type, not by an ASCII glyph. */
function RefGlyph(props: { kind?: string }): ReactNode {
  if (props.kind === 'url') return createElement(LinkRefIcon)
  if (props.kind === 'terminal') return createElement(TerminalRefIcon)
  if (props.kind === 'file') return createElement(FileRefIcon)
  return createElement(CodeRefIcon)
}

const SOURCE_FILE_RE = /\.(?:tsx?|jsx?|mjs|cjs|cs|py|go|rs|java|kt|rb|php|swift|scala|lua|sh|ps1)$/i

function refIconKind(ref: any): 'code' | 'file' {
  return SOURCE_FILE_RE.test(String(ref?.absPath ?? ref?.path ?? '')) ? 'code' : 'file'
}

/** Collapsed listing of references that actually appeared in assistant prose. */
const RefsFooter = memo(function RefsFooter({ ledger, cwd, props, onContextMenu, onRunCommand }: {
  ledger: any
  cwd: string | undefined
  props: any
  onContextMenu: (event: any, target: any) => void
  onRunCommand: (command: string) => void
}): ReactNode {
  const files: any[] = (ledger?.refs?.files ?? []).filter((ref: any) => ref.visible === true)
  const urls: any[] = (ledger?.refs?.urls ?? []).filter((ref: any) => ref.visible === true)
  const commands: any[] = (ledger?.refs?.commands ?? []).filter((ref: any) => ref.visible === true)
  const [opening, setOpening] = useState<string | null>(null)
  if (files.length === 0 && urls.length === 0 && commands.length === 0) return null
  const sortedFiles = [...files].sort((a, b) => (b.visibleSeqs?.at(-1) ?? 0) - (a.visibleSeqs?.at(-1) ?? 0))
  const shownFiles = sortedFiles.slice(0, 60)
  const shownUrls = urls.slice(0, 20)
  const shownCommands = commands.slice(0, 30)
  const countBadge = (count: number, suffix: string) => createElement('span', {
    className: 'dcr-ref-count',
    'data-count': count,
  }, `${count} ${suffix}`)
  const group = (key: string, title: string, count: number, children: ReactNode[]) => createElement('details', {
    key,
    className: 'dcr-ref-group',
    open: true,
  },
  createElement('summary', { className: 'dcr-ref-group-summary' },
    createElement(ChevronRefIcon),
    createElement('span', { className: 'dcr-ref-group-title' }, title),
    countBadge(count, '')),
  createElement('div', { className: 'dcr-ref-group-body' }, ...children))

  const openItem = async (key: string, open: () => Promise<void>): Promise<void> => {
    if (opening !== null) return
    setOpening(key)
    try { await open() } finally { setOpening(null) }
  }
  const fileItem = (ref: any, index: number): ReactNode => {
    const line = ref.lines?.[0]?.start
    const label = relativeForFooter(ref.absPath ?? ref.path, cwd)
    const sources = [...new Set((ref.occurrences ?? []).map((occ: any) => occ.source))].join('/')
    const target = { file: ref.absPath ?? ref.path, line: line ?? 1, title: label }
    const key = `f:${ref.absPath ?? ref.path}:${index}`
    const busy = opening === key
    return createElement('div', { key, className: `dcr-ref-item dcr-ref-item-${refIconKind(ref)}` },
      createElement('button', {
        type: 'button',
        title: ref.absPath ?? ref.path,
        'aria-busy': busy ? 'true' : undefined,
        onClick: () => { void openItem(key, () => openReference(props, { file: ref.absPath ?? ref.path, line: line ?? 1 })) },
        onContextMenu: (event: any) => { event.preventDefault(); onContextMenu(event, target) },
        className: 'dcr-ref-link',
      },
      busy ? createElement(SpinnerRefIcon) : createElement(RefGlyph, { kind: refIconKind(ref) }),
      createElement('span', { className: 'dcr-ref-label' }, label + (line === undefined ? '' : `:${line}`))),
      createElement('span', { className: 'dcr-ref-meta' },
        [sources, ref.occurrences?.length > 1 ? `${ref.occurrences.length} 次` : ''].filter(Boolean).join(' · ')))
  }

  return createElement('details', { className: 'dcr-refs', 'data-coderef-refs': 'true' },
    createElement('summary', { className: 'dcr-refs-summary' },
      createElement(ChevronRefIcon),
      createElement('span', { className: 'dcr-refs-title' }, '引用'),
      createElement('span', { className: 'dcr-refs-counts' },
        countBadge(files.length, '文件'),
        urls.length > 0 ? countBadge(urls.length, '链接') : null,
        commands.length > 0 ? countBadge(commands.length, '命令') : null)),
    createElement('div', { className: 'dcr-refs-body' },
      files.length > 0 ? group('files', '文件', files.length, [
        ...shownFiles.map(fileItem),
        files.length > shownFiles.length
          ? createElement('div', { key: 'files-more', className: 'dcr-ref-more' }, `还有 ${files.length - shownFiles.length} 个文件`)
          : null,
      ]) : null,
      urls.length > 0 ? group('urls', '链接', urls.length, [
        ...shownUrls.map(ref => createElement('div', { key: `u:${ref.canonical}`, className: 'dcr-ref-item dcr-ref-item-url' },
          createElement('button', {
            type: 'button',
            title: ref.url,
            className: 'dcr-ref-link',
            onClick: () => {
              if (typeof window !== 'undefined') window.open(ref.url, '_blank', 'noopener,noreferrer')
            },
          },
          createElement(RefGlyph, { kind: 'url' }),
          createElement('span', { className: 'dcr-ref-label' }, ref.title ?? ref.url)),
          createElement('span', { className: 'dcr-ref-meta' }, 'web'))),
        urls.length > shownUrls.length
          ? createElement('div', { key: 'urls-more', className: 'dcr-ref-more' }, `还有 ${urls.length - shownUrls.length} 个链接`)
          : null,
      ]) : null,
      commands.length > 0 ? group('commands', '命令', commands.length, [
        ...shownCommands.map(ref => createElement('div', { key: `c:${ref.command}`, className: 'dcr-ref-item dcr-ref-item-terminal' },
          createElement('button', {
            type: 'button',
            title: `点击填入侧边栏终端（不执行）\n${ref.command}`,
            onClick: () => onRunCommand(ref.command),
            className: 'dcr-ref-link dcr-command-row',
          },
          createElement(RefGlyph, { kind: 'terminal' }),
          createElement('span', { className: 'dcr-ref-label' }, commandDisplayLabel(ref.command))),
          createElement('span', { className: 'dcr-ref-meta' }, ref.command.length > 96 ? 'terminal · long' : 'terminal'))),
        commands.length > shownCommands.length
          ? createElement('div', { key: 'commands-more', className: 'dcr-ref-more' }, `还有 ${commands.length - shownCommands.length} 个命令`)
          : null,
      ]) : null))
})

// ───────────────────────── assistant renderer ─────────────────────────
const CoderefRenderer = memo(function CoderefRenderer(props: any): ReactNode {
  ensureStyles()
  const node = props?.node
  const data = node !== null && typeof node === 'object' ? node.data : undefined
  const blocks: any[] = data !== null && typeof data === 'object' && Array.isArray(data.blocks) ? data.blocks : []
  const streaming = data !== null && typeof data === 'object' && data.status === 'running'
  const interrupted = data !== null && typeof data === 'object' && data.status === 'interrupted'
  const cwd = typeof props?.cwd === 'string' ? props.cwd : undefined
  const sessionId = resolveCurrentSessionId()
  const tail = typeof props?.useTurnData === 'function' ? props.useTurnData('turn-tail') : undefined
  const turn = node?.location?.kind === 'turn' || node?.location?.kind === 'step' ? node.location.turn : undefined
  const isClosing = turn?.status === 'closed'
    && data?.finalNode !== undefined
    && tail?.closing?.finalNode?.seq === data.finalNode.seq
  const [items, setItems] = useState<Map<string, any>>(EMPTY_MAP)
  const [resolveRetry, setResolveRetry] = useState(0)
  const resolveRetryTimer = useRef<any>(null)
  const retryTokenRef = useRef('')
  const [ledger, setLedger] = useState<any>(null)
  const [menu, setMenu] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [openingFile, setOpeningFile] = useState<string | null>(null)
  const toastTimer = useRef<any>(null)
  const lastKeyRef = useRef('')
  const tokens = useMemo(() => collectTokens(blocks), [blocks])
  const tokenKey = useMemo(
    () => `${tokens.bold.join('\u0000')}\u0002${tokens.inline.join('\u0000')}`,
    [tokens],
  )

  useEffect(() => {
    if (cwd === undefined || sessionId === undefined) return undefined
    return subscribeLedger(sessionId, cwd, (data: any) => { setLedger(data) })
  }, [sessionId, cwd])

  useEffect(() => () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current)
    if (resolveRetryTimer.current !== null) clearTimeout(resolveRetryTimer.current)
    toastTimer.current = null
    resolveRetryTimer.current = null
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onProgress = (event: Event): void => {
      const detail = (event as CustomEvent).detail
      if (detail === null || typeof detail !== 'object') return
      setOpeningFile(detail.active === true && typeof detail.file === 'string' ? detail.file : null)
    }
    window.addEventListener(OPEN_PROGRESS_EVENT, onProgress)
    return () => window.removeEventListener(OPEN_PROGRESS_EVENT, onProgress)
  }, [])

  const runCommand = useCallback((command: string): Promise<void> => {
    return (async () => {
      const mode = await fillTerminalInput(command)
      setToast(mode === 'terminal'
        ? '已填入侧边栏终端（未执行）'
        : mode === 'clipboard' ? '终端不可用，已复制命令' : '无法写入终端')
      if (toastTimer.current !== null) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(null), 2600)
    })()
  }, [])

  const textMentions = useMemo(
    () => ledger === null ? undefined : createTextMatcher(ledger, cwd, props, (command: string) => { void runCommand(command) }),
    [ledger, cwd, props, runCommand],
  )

  const commandMentions = useMemo<MarkdownCommandMentions>(() => ({
    resolve(value: string) {
      const command = value.trim()
      if (!looksLikeCommandText(command)) return undefined
      return {
        label: value,
        title: '命令 · 点击填入终端（不执行）',
        run: () => { void runCommand(command) },
      }
    },
  }), [runCommand])

  const showContextMenu = (event: any, target: any): void => {
    if (target?.file === undefined) return
    event.preventDefault()
    setMenu({
      x: event.clientX,
      y: event.clientY,
      file: target.file,
      line: target.line ?? 1,
      endLine: target.endLine,
      title: target.title,
    })
  }

  useEffect(() => {
    if (retryTokenRef.current === tokenKey) return undefined
    retryTokenRef.current = tokenKey
    setResolveRetry(0)
    return () => {
      if (resolveRetryTimer.current !== null) {
        clearTimeout(resolveRetryTimer.current)
        resolveRetryTimer.current = null
      }
    }
  }, [tokenKey])

  useEffect(() => {
    if (streaming || cwd === undefined) {
      setItems(EMPTY_MAP)
      return undefined
    }
    if (tokens.bold.length === 0 && tokens.inline.length === 0) {
      setItems(EMPTY_MAP)
      return undefined
    }
    const key = `${sessionId ?? ''}|${cwd}|${tokenKey}|${resolveRetry}`
    if (lastKeyRef.current === key) return undefined
    lastKeyRef.current = key
    let cancelled = false
    resolveTokens({ cwd, sessionId, bold: tokens.bold, inline: tokens.inline })
      .then(next => {
        if (cancelled) return
        setItems(next)
        // The Host workspace index may still be building on the first request;
        // retry a couple of times so later-ready symbols become links too.
        const unresolved = next instanceof Map
          && [...next.values()].some((item: any) => item !== null && typeof item === 'object' && item.status === 'unresolved')
        if (unresolved && resolveRetry < 4) {
          if (resolveRetryTimer.current !== null) clearTimeout(resolveRetryTimer.current)
          resolveRetryTimer.current = setTimeout(() => { setResolveRetry(value => value + 1) }, 4000)
        }
      })
      .catch((error: any) => {
        if (cancelled) return
        debug.lastError = String(error?.message ?? error)
      })
    return () => { cancelled = true }
  }, [streaming, cwd, sessionId, tokenKey, tokens, resolveRetry])

  const hits = useMemo(() => {
    const map = new Map<string, any>()
    for (const [text, item] of items instanceof Map ? items : []) {
      if (item !== null && typeof item === 'object' && item.status === 'linked' && item.chosen !== null && item.chosen !== undefined) {
        map.set(text, item.chosen)
      }
    }
    return map
  }, [items])

  const snippets = useMemo(() => {
    const map = new Map<string, any>()
    for (const ref of ledger?.refs?.snippets ?? []) {
      if (typeof ref?.snippet === 'string') map.set(normalizeSnippetText(ref.snippet), ref)
    }
    return map
  }, [ledger])

  const mentions = useMemo<MarkdownFileMentions>(() => ({
    resolve(value: string) {
      // Exact source-line/expression snippets win over the generic resolver:
      // `bIsTickable = false` or a whole code line can point at its own line.
      const snippet = snippets.get(normalizeSnippetText(value))
      if (snippet !== undefined) {
        return {
          label: value,
          title: `${snippet.file}:${snippet.line}`,
          file: snippet.absPath ?? snippet.file,
          line: snippet.line,
          open: () => { void openReference(props, { file: snippet.absPath ?? snippet.file, line: snippet.line }) },
        }
      }
      const hit = hits.get(value)
      if (hit === undefined) return undefined
      return {
        label: hit.file,
        title: formatTitle(hit),
        file: absoluteRefFile(hit.file, cwd, ledger),
        line: hit.line,
        endLine: hit.endLine,
        open: () => { void openReference(props, { ...hit, file: absoluteRefFile(hit.file, cwd, ledger) }) },
      }
    },
  }), [hits, snippets, props, cwd, ledger])

  const rootRef = useRef<HTMLDivElement>(null)
  const textMentionsWithHits = useMemo<MarkdownTextMentions | undefined>(() => {
    if (textMentions === undefined) return undefined
    return {
      match(value: string): TextMention[] {
        const spans: TextMention[] = [...textMentions.match(value)]
        const covered = (start: number, end: number): boolean => spans.some(span => start < span.end && end > span.start)
        const pattern = /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g
        let token: RegExpExecArray | null
        while ((token = pattern.exec(value)) !== null) {
          const start = token.index
          const end = start + token[0].length
          if (covered(start, end) || !hits.has(token[0])) continue
          const mention = mentions.resolve(token[0])
          if (mention === undefined) continue
          spans.push({
            start,
            end,
            kind: 'symbol',
            label: token[0],
            title: mention.title,
            file: mention.file,
            line: mention.line,
            endLine: mention.endLine,
            open: mention.open,
          })
        }
        return spans.sort((left, right) => left.start - right.start || right.end - left.end)
      },
    }
  }, [textMentions, mentions, hits])

  useEffect(() => {
    if (streaming || rootRef.current === null) return undefined
    let timer: any = null
    const run = (): void => {
      if (rootRef.current !== null) decorateCodeBlocks(rootRef.current, textMentions, mentions, hits)
    }
    const schedule = (): void => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(run, 40)
    }
    schedule()
    const observer = new MutationObserver(schedule)
    observer.observe(rootRef.current, { childList: true, subtree: true })
    const settle = setTimeout(() => { observer.disconnect(); run() }, 1500)
    return () => {
      if (timer !== null) clearTimeout(timer)
      clearTimeout(settle)
      observer.disconnect()
    }
  }, [streaming, textMentions, textMentionsWithHits, mentions, hits, blocks, ledger])

  const coderefLinks = useMemo(() => ({
    open(href: string) {
      const parsed = parseCoderefHref(href)
      if (parsed === undefined) return
      if (parsed.kind === 'command') {
        if (typeof parsed.command === 'string' && parsed.command !== '') void runCommand(parsed.command)
        return
      }
      if (parsed.kind === 'symbol') {
        const name = parsed.name
        const candidates = (ledger?.refs?.symbols ?? [])
          .filter((ref: any) => ref.name === name)
          .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0))
        const ref = candidates[0]
        if (ref !== undefined) {
          void openReference(props, { file: ref.absPath ?? ref.file, line: ref.line ?? 1 })
          return
        }
        // Ledger may not contain the symbol yet; ask the Host resolver.
        const sessionId = resolveCurrentSessionId()
        if (cwd !== undefined && sessionId !== undefined) {
          void resolveTokens({ cwd, sessionId, bold: [name], inline: [] }).then(items => {
            const item = items.get(name)
            if (item !== undefined && item !== null && item.status === 'linked' && item.chosen !== null && item.chosen !== undefined) {
              void openReference(props, item.chosen)
            }
          }).catch(() => {})
        }
        return
      }
      void openReference(props, { ...parsed, file: absoluteRefFile(parsed.file, cwd, ledger) })
    },
  }), [props, ledger, cwd, runCommand])

  const labels = useMemo<MarkdownLabels>(() => ({
    code: {
      copyLabel: translate(props?.t, 'copy', '复制'),
      copiedLabel: translate(props?.t, 'copied', '已复制'),
    },
    footnotes: translate(props?.t, 'markdown.footnotes', '脚注'),
  }), [props?.t])

  const rendered: ReactNode[] = []
  blocks.forEach((block, index) => {
    if (block === null || typeof block !== 'object') return
    if (block.kind === 'text') {
      rendered.push(createElement(MarkdownText as any, {
        key: `b${index}`,
        text: block.text ?? '',
        streaming,
        labels,
        fileMentions: streaming ? undefined : mentions,
        coderefLinks: streaming ? undefined : coderefLinks,
        textMentions: streaming ? undefined : textMentionsWithHits,
        commandMentions: streaming ? undefined : commandMentions,
        onReferenceContextMenu: streaming ? undefined : showContextMenu,
      }))
    } else if (block.kind === 'reasoning') {
      rendered.push(createElement(ReasoningBlock, {
        key: `b${index}`,
        text: block.text ?? '',
        running: streaming,
        t: props?.t,
      }))
    } else if (block.kind === 'image') {
      rendered.push(createElement('span', { key: `b${index}`, className: 'dcr-image-alt' }, '[image]'))
    }
  })

  debug.renders += 1
  return createElement('div', {
    className: 'dcr-root',
    ref: rootRef,
    'data-coderef-renderer': 'fork',
    ...(streaming ? { 'data-streaming': 'true' } : {}),
  }, createElement('div', { className: 'dcr-body' }, rendered,
    interrupted ? createElement('span', { key: 'stopped', className: 'dcr-stopped' }, 'stopped') : null),
  isClosing && ledger !== null
    ? createElement(RefsFooter, { ledger, cwd, props, onContextMenu: showContextMenu, onRunCommand: (command: string) => { void runCommand(command) } })
    : null,
  menu === null
    ? null
    : createElement(ReferenceMenu, { menu, props, onClose: () => setMenu(null) }),
  openingFile === null
    ? null
    : createElement('div', {
      className: 'dcr-open-indicator',
      'data-coderef-opening': 'true',
      role: 'status',
      'aria-live': 'polite',
    },
    createElement(SpinnerRefIcon),
    createElement('span', { className: 'dcr-open-label' },
      `正在打开 ${String(openingFile).split(/[\\/]/).pop() ?? '文件'}…`)),
  toast === null
    ? null
    : createElement('div', { className: 'dcr-toast', 'data-coderef-toast': 'true', role: 'status' }, toast))
})

class RendererErrorBoundary extends Component<{ fallbackText: string; children?: ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: any): { error: any } {
    return { error }
  }
  componentDidCatch(error: any, info: any): void {
    debug.lastError = String(error?.stack ?? error?.message ?? error)
    debug.lastComponentStack = String(info?.componentStack ?? '')
  }
  render(): ReactNode {
    if (this.state.error !== null) {
      return createElement('pre', { className: 'dcr-fallback' }, this.props.fallbackText)
    }
    return this.props.children
  }
}

function blockText(blocks: any[]): string {
  return (Array.isArray(blocks) ? blocks : [])
    .filter(block => block !== null && typeof block === 'object' && (block.kind === 'text' || block.kind === 'reasoning'))
    .map(block => block.text ?? '')
    .join('\n\n')
}

function CoderefAssistantStep(props: any): ReactNode {
  const node = props?.node
  const data = node !== null && typeof node === 'object' ? node.data : undefined
  const blocks = data !== null && typeof data === 'object' && Array.isArray(data.blocks) ? data.blocks : []
  return createElement(RendererErrorBoundary, { fallbackText: blockText(blocks) },
    createElement(CoderefRenderer, props))
}

export const inject = ['slots']

export function apply(ctx: any): void {
  try {
    if (ctx === undefined || ctx === null) return
    clientCtx = ctx
    ensureStyles()
    const slots = ctx.slots
    if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
      debug.lastError = 'slots-unavailable'
      return
    }
    const register = () => slots.register({
      name: 'conversation.chat.node',
      key: 'assistant-step',
      priority: SLOT_PRIORITY,
      locale: 'chat',
    }, CoderefAssistantStep)
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => {
        const dispose = slots.inject('conversation.chat.node', register)
        return () => {
          try {
            if (typeof dispose === 'function') dispose()
          } catch { /* ignore */ }
        }
      }, 'dsh-coderef-renderer: shadow assistant-step')
    } else {
      slots.inject('conversation.chat.node', register)
    }
    debug.mounted = true
    console.info(`[${PLUGIN_ID}] fork renderer loaded (v${VERSION}), shadow conversation.chat.node[assistant-step] @ priority ${SLOT_PRIORITY}`)
  } catch (error: any) {
    debug.lastError = String(error?.message ?? error)
    console.warn(`[${PLUGIN_ID}] client apply failed`, error)
  }
}

export function __resetState(): void {
  clientCtx = null
  tokenCache.clear()
  debug.mounted = false
  debug.renders = 0
  debug.lastError = null
  debug.lastResolve = null
  debug.lastOpen = null
  debug.lastPing = null
  pingGeneration += 1
}

export const name = PLUGIN_ID
export const version = VERSION


