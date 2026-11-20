/**
 * Host half of dsh-coderef-renderer: intentionally inert.
 *
 * The renderer lives entirely in the browser half; it calls the existing
 * `/coderef/*` routes served by the dsh-coderef Host plugin. Keeping an empty
 * host body keeps the plugin visible to the Loader/profile bundle stack without
 * duplicating the resolver.
 *
 * @module dsh-coderef-renderer
 */

export const name = 'dsh-coderef-renderer'
export const VERSION = '0.1.0'
export const inject = []

/**
 * No host-side behaviour.
 * @param {any} _ctx host context
 */
export function apply(_ctx) {
  // Renderer is client-only; the dsh-coderef Host half owns /coderef/*.
}
