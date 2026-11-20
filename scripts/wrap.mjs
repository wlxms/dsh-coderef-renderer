// Wrap the esbuild CJS output into the DSH lazy-CJS ModuleLoader contract.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const implPath = new URL('../lib/impl.js', import.meta.url)
const outPath = new URL('../lib/client.js', import.meta.url)
const miniPath = new URL('../lib/client.mini.js', import.meta.url)

if (!existsSync(miniPath) && existsSync(outPath)) {
  copyFileSync(outPath, miniPath)
}

const impl = readFileSync(implPath, 'utf8')
const wrapped = `window.__ModuleLoader__.load({
	id: "dsh-coderef-renderer",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
${impl}
		return module.exports;
	},
});
`
writeFileSync(outPath, wrapped, 'utf8')
console.log(`wrapped ${impl.length} bytes -> lib/client.js`)
