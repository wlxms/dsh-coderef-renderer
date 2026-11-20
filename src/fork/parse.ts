/**
 * Fork of the DSH ui-primitives grammars: GFM + the CJK-friendly strong
 * extension. Math is dropped for the first fork version (the KaTeX fork arm
 * stays literal text), so the settled and streaming grammars are identical.
 */

import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import { cjkFriendlyStrong } from './cjkFriendlyStrong.ts'

/**
 * Parse GFM markdown.
 * @param text - Markdown source.
 * @returns The mdast root.
 */
export function parseGfm(text: string): Root {
  return fromMarkdown(text, {
    extensions: [gfm(), cjkFriendlyStrong()],
    mdastExtensions: [gfmFromMarkdown()],
  })
}

/**
 * Kept for the forked MarkdownText call sites; math is not enabled in this fork.
 * @param text - Markdown source.
 * @returns The mdast root.
 */
export function parseGfmWithMath(text: string): Root {
  return parseGfm(text)
}
