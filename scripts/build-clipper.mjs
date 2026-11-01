#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = join(root, 'clipper-extension')
const output = join(root, 'dist', 'clipper')
const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'))
const admitted = ['activeTab', 'contextMenus', 'scripting', 'storage']
const failures = []

if (manifest.manifest_version !== 3) failures.push('manifest_version must be 3')
if (JSON.stringify([...(manifest.permissions || [])].sort()) !== JSON.stringify(admitted)) failures.push('permissions exceed activeTab/scripting/storage/contextMenus')
const hosts = manifest.host_permissions || []
if (hosts.length === 0 || hosts.some(pattern => !/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/\*$/.test(pattern))) {
  failures.push('host_permissions must be loopback-only')
}
for (const file of await readdir(source)) {
  if (!/\.(?:js|html|css|json)$/.test(file)) continue
  const text = await readFile(join(source, file), 'utf8')
  if (/chrome\.storage\.sync|chrome\.tabs\.create|tabs\.create\s*\(/.test(text)) failures.push(`${file} contains a forbidden sync-secret or tab-creation path`)
  if (file.endsWith('.js')) {
    try { new vm.Script(text, { filename: file }) } catch (error) { failures.push(`${file} does not parse: ${error.message}`) }
  }
}
if (failures.length > 0) {
  for (const failure of failures) console.error(`build-clipper: ${failure}`)
  process.exit(1)
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(source, output, { recursive: true })
const files = (await readdir(output)).sort()
console.log(`build-clipper: dist/clipper (${files.join(', ')})`)
