/**
 * Local link glyphs for coderef chips.
 *
 * The fork used to re-export `LinkIcon` from the DSH primitives package, but
 * that export is not part of every DSH version. Keeping a tiny local glyph
 * makes the renderer independent of the primitives package version.
 */
import { createElement } from 'react'

export type LinkKind = 'code' | 'url' | 'file' | string

export function classifyLinkPath(value: string): LinkKind {
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return 'url'
  return 'code'
}

export function LinkIcon(props: { kind?: LinkKind; className?: string }): any {
  const url = props.kind === 'url'
  return createElement('svg', {
    className: props.className,
    width: 12,
    height: 12,
    viewBox: '0 0 16 16',
    fill: 'none',
    'aria-hidden': 'true',
    style: { flexShrink: 0, verticalAlign: '-1px' },
  },
  url
    ? createElement('path', {
      d: 'M6.5 3.5h6v6M12 4 7 9M6 4H4.5A1.5 1.5 0 0 0 3 5.5v6A1.5 1.5 0 0 0 4.5 13h6A1.5 1.5 0 0 0 12 11.5V10',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    })
    : createElement('path', {
      d: 'M5 3.5 11.5 8 5 12.5',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }))
}
