#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const skillsRoot = join(root, 'packages', 'dsh-cloudflare', 'skills')
const outFile = join(root, 'packages', 'dsh-cloudflare', 'src', 'manifest.ts')

function splitFrontmatter(raw) {
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return undefined
  const firstLine = raw.slice(0, firstLineEnd).replace(/\r$/, '')
  if (firstLine !== '---') return undefined
  const start = firstLineEnd + 1
  const closing = raw.indexOf('\n---', start)
  if (closing < 0) return undefined
  const data = raw.slice(start, closing)
  const bodyStart = raw.indexOf('\n', closing + 1)
  return { data, body: raw.slice(bodyStart < 0 ? raw.length : bodyStart + 1) }
}

function parseSimpleYaml(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out = {}
  let key
  let block
  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const m = line.match(/^([A-Za-z0-9_-]+):(?: (.*))?$/)
    if (m && line[0] !== ' ' && line[0] !== '\t') {
      key = m[1]
      block = undefined
      if (m[2] === undefined) {
        out[key] = undefined
      } else if (m[2] === '|' || m[2] === '>') {
        block = { fold: m[2] === '>', lines: [] }
        out[key] = block
      } else {
        out[key] = parseScalar(m[2])
      }
      continue
    }
    if (key !== undefined) {
      const item = line.match(/^\s*-\s+(.*)$/)
      const inner = line.replace(/^\s+/, '')
      if (block && (item || inner.trim() === '')) {
        block.lines.push(item ? item[1] : '')
        continue
      }
      if (block && !item) {
        block.lines.push(inner)
        continue
      }
      if (item) {
        const list = Array.isArray(out[key]) ? out[key] : (out[key] = [])
        list.push(parseScalar(item[1]))
        continue
      }
    }
  }
  const result = {}
  for (const [k, v] of Object.entries(out)) {
    if (v && typeof v === 'object' && 'fold' in v) {
      result[k] = v.lines.join(v.fold ? ' ' : '\n').trim()
    } else {
      result[k] = v
    }
  }
  return result
}

function parseScalar(v) {
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null' || v === '~') return null
  if (/^-?\d+$/.test(v)) return Number(v)
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  return v
}

(async () => {
  const entries = await readdir(skillsRoot)
  const skills = []
  const missing = []
  for (const name of entries.sort()) {
    const dir = join(skillsRoot, name)
    const info = await stat(dir)
    if (!info.isDirectory()) continue
    const skillMd = join(dir, 'SKILL.md')
    let raw
    try {
      raw = await readFile(skillMd, 'utf8')
    } catch {
      missing.push(name)
      continue
    }
    const parts = splitFrontmatter(raw)
    if (!parts) { missing.push(name); continue }
    const fm = parseSimpleYaml(parts.data)
    const description = typeof fm.description === 'string' ? fm.description.trim() : undefined
    if (typeof fm.name !== 'string' || !description) { missing.push(name); continue }
    const entries2 = await readdir(dir)
    const hasResources = entries2.some(e => e === 'references' || e === 'assets' || e === 'agents')
    skills.push({ name: fm.name, description, hasResources })
  }
  if (missing.length > 0) {
    console.error('SKILL.md missing or missing name/description frontmatter:', missing)
    process.exit(1)
  }
  const entryLines = skills.map(s => '  { name: ' + JSON.stringify(s.name) + ', description: ' + JSON.stringify(s.description) + ', hasResources: ' + s.hasResources + ' },')
  const indexLines = skills.map((s, i) => '  ' + JSON.stringify(s.name) + ': ' + i + ',')
  const lines = [
    '/**',
    ' * Auto-generated from the vendored Codex Cloudflare skill frontmatter.',
    ' * Do not edit by hand; regenerate with: node scripts/gen-manifest.mjs',
    ' */',
    '',
    'export interface VendoredSkill {',
    '  /** Kebab-case skill name (matches the skill directory). */',
    '  readonly name: string',
    '  /** Model-facing description from the SKILL.md frontmatter. */',
    '  readonly description: string',
    "  /** Whether the skill bundle ships a references/ or assets/ directory. */",
    '  readonly hasResources: boolean',
    '}',
    '',
    '/** The complete vendored Codex Cloudflare skill surface, in stable order. */',
    'export const VENDORED_SKILLS: readonly VendoredSkill[] = [',
    ...entryLines,
    ']',
    '',
    '/** Map of skill name to its index in {@link VENDORED_SKILLS}. */',
    'export const VENDORED_SKILL_INDEX: Readonly<Record<string, number>> = {',
    ...indexLines,
    '}',
    '',
  ]
  await writeFile(outFile, lines.join('\n'), 'utf8')
  console.log('generated ' + relative(root, outFile) + ' with ' + skills.length + ' skills')
})().catch(err => { console.error(err); process.exit(1) })
