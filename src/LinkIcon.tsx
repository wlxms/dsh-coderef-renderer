/**
 * Local vector glyphs for coderef chips in assistant prose.
 *
 * The fork used to re-export `LinkIcon` from the DSH primitives package, but
 * that export is not part of every DSH version. Keeping the icons local also
 * guarantees one optical size and one stroke weight for code, file, URL and
 * terminal references.
 */
import { createElement, type ReactNode } from 'react'

export type LinkKind = 'code' | 'file' | 'url' | 'terminal'

const SOURCE_EXT = /\.(?:tsx?|jsx?|mjs|cjs|cs|py|go|rs|java|kt|rb|php|swift|scala|lua|sh|ps1)(?=$|[:#])/i
const FILE_EXT = /(?:^|[\\/])[^\\/]+\.[A-Za-z0-9]{1,8}(?=$|[:#])/

/** Classify a coderef destination or inline token for icon selection. */
export function classifyLinkPath(value: string): LinkKind {
  const raw = String(value).replace(/^coderef:/i, '').split('#')[0] ?? ''
  if (/^(?:https?:\/\/|mailto:)/i.test(raw)) return 'url'
  if (SOURCE_EXT.test(raw)) return 'code'
  if (FILE_EXT.test(raw)) return 'file'
  if (/[\\/]/.test(raw)) return 'file'
  return 'code'
}

function paths(kind: LinkKind): ReactNode[] {
  if (kind === 'url') {
    return [
      createElement('path', { key: 'a', d: 'M9.2 2.7h4.1v4.1' }),
      createElement('path', { key: 'b', d: 'm13.2 2.8-5.6 5.6' }),
      createElement('path', { key: 'c', d: 'M11.3 9.1v3.1H2.8V3.9h3.1' }),
    ]
  }
  if (kind === 'terminal') {
    return [
      createElement('rect', { key: 'a', x: 1.8, y: 2.8, width: 12.4, height: 10.4, rx: 2.2 }),
      createElement('path', { key: 'b', d: 'm4.7 6 2.1 2-2.1 2' }),
      createElement('path', { key: 'c', d: 'M8.9 10h2.7' }),
    ]
  }
  if (kind === 'file') {
    return [
      createElement('path', { key: 'a', d: 'M4 1.9h5.1L12 4.8v9.3H4z' }),
      createElement('path', { key: 'b', d: 'M9.1 1.9v3h2.9' }),
    ]
  }
  return [
    createElement('path', { key: 'a', d: 'M5.1 4.3 1.9 8l3.2 3.7' }),
    createElement('path', { key: 'b', d: 'm10.9 4.3 3.2 3.7-3.2 3.7' }),
    createElement('path', { key: 'c', d: 'M9.2 2.8 6.8 13.2' }),
  ]
}

export function LinkIcon(props: { kind?: LinkKind; className?: string }): any {
  const kind = props.kind ?? 'code'
  return createElement('svg', {
    className: props.className,
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    style: { flexShrink: 0, verticalAlign: '-1px' },
  }, ...paths(kind))
}
