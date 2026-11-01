#!/usr/bin/env node
/**
 * Build the browser half of the bundle: client/index.tsx → dist/client.js.
 *
 * The output is a single self-registering module-table entry:
 * `window.__ModuleLoader__.load({ id: <package name>, factory(require) {…} })`.
 * React and the shell's platform libraries stay external and resolve through
 * the factory's `require` against the shell's frozen module table, so the
 * bundle never embeds a second React. The build asserts the registration id
 * and the externals afterwards, so a misconfigured build fails loudly here
 * instead of silently breaking the shell.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

/** Platform modules the shell's module table supplies (see ui-theme/web seed). */
const PLATFORM_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

await build({
  absWorkingDir: root,
  entryPoints: ['client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.png': 'dataurl' },
  external: PLATFORM_EXTERNALS,
  outfile: 'dist/client.js',
  logLevel: 'info',
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {\nconst module = { exports: {} };`,
  },
  footer: {
    js: 'return module.exports;\n}});',
  },
})

const output = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
const failures = []
if (!output.includes(`window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}`)) {
  failures.push('dist/client.js does not register under the package name')
}
for (const specifier of ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives']) {
  if (!output.includes(`require(${JSON.stringify(specifier)})`)) {
    failures.push(`dist/client.js does not require the shared ${specifier}`)
  }
}
if (output.includes('ReactCurrentOwner') || output.includes('react.production')) {
  failures.push('dist/client.js embeds a bundled React — React must stay external')
}
if (failures.length > 0) {
  for (const failure of failures) console.error(`build-client: ${failure}`)
  process.exit(1)
}
console.log(`build-client: dist/client.js registered as ${pkg.name} (${(output.length / 1024).toFixed(1)} KiB)`)
