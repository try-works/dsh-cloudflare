#!/usr/bin/env node
// Typecheck/build @try-works/dsh-cloudflare.
//
// Resolution order for the TypeScript compiler:
//   1. <package>/node_modules/typescript — a normal install (prepack/build).
//   2. $DSH_HARNESS/node_modules/typescript — the DeepSeek Harness checkout,
//      used in the offline sandbox where npm install is unavailable.
//
// The portable tsconfig.json has no absolute paths and expects @types/node in
// the package's own node_modules. In harness-fallback mode we generate a
// temporary tsconfig.build.json extending it with the harness @types root.
import { spawn } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = join(root, 'packages', 'dsh-cloudflare')

let tsc = join(packageDir, 'node_modules', 'typescript', 'bin', 'tsc')
let buildConfig = join(packageDir, 'tsconfig.json')
let cleanup = null

if (!existsSync(tsc)) {
  const harness = process.env.DSH_HARNESS ?? 'D:/deepseek-harness'
  const fallback = join(harness, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!existsSync(fallback)) {
    console.error('typecheck: typescript not found. Run "npm install" in packages/dsh-cloudflare, or set DSH_HARNESS to a harness checkout with node_modules.')
    process.exit(1)
  }
  tsc = fallback
  const nodeTypes = join(harness, 'node_modules', '@types')
  if (existsSync(nodeTypes)) {
    buildConfig = join(packageDir, 'tsconfig.build.json')
    writeFileSync(buildConfig, JSON.stringify({
      extends: './tsconfig.json',
      compilerOptions: { typeRoots: [nodeTypes.replace(/\\\\/g, '/')] },
    }, null, 2))
    cleanup = () => rmSync(buildConfig, { force: true })
  }
}

const child = spawn(process.execPath, [
  tsc,
  '-b',
  buildConfig,
  '--pretty', 'false',
  ...process.argv.slice(2),
], { stdio: 'inherit' })
child.on('exit', (code) => {
  cleanup?.()
  process.exit(code ?? 1)
})
child.on('error', (err) => { cleanup?.(); console.error(err); process.exit(1) })
