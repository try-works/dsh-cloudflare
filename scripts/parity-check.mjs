#!/usr/bin/env node
// Parity smoke test: assert the generated manifest matches the vendored
// Codex skill/command/MCP surface.
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'packages', 'dsh-cloudflare')
const skillsRoot = join(pkg, 'skills')

// ---- skills ----
const skillDirs = []
for (const d of await readdir(skillsRoot)) {
  if ((await stat(join(skillsRoot, d))).isDirectory()) skillDirs.push(d)
}
skillDirs.sort()

const { VENDORED_SKILLS } = await import('../packages/dsh-cloudflare/lib/manifest.js')

assert.deepEqual(
  VENDORED_SKILLS.map(s => s.name),
  skillDirs,
  'manifest names must equal vendored skill dirs',
)
assert.equal(VENDORED_SKILLS.length, 11, 'expected exactly 11 skills')

// Every entry must be a valid DSH skill name and carry a non-empty description.
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
for (const skill of VENDORED_SKILLS) {
  assert.match(skill.name, SKILL_NAME, 'invalid skill name: ' + skill.name)
  assert.ok(skill.description.length > 0, 'empty description for ' + skill.name)
}

// ---- commands ----
const commandFiles = (await readdir(join(pkg, 'commands'))).filter(f => f.endsWith('.md'))
assert.deepEqual(commandFiles.sort(), ['build-agent.md', 'build-mcp.md'], 'expected 2 commands')

// ---- mcp ----
const mcp = JSON.parse(await readFile(join(pkg, '.mcp.json'), 'utf8'))
assert.deepEqual(Object.keys(mcp.mcpServers), ['cloudflare-api'], 'expected 1 MCP server')
assert.equal(mcp.mcpServers['cloudflare-api'].url, 'https://mcp.cloudflare.com/mcp')

// ---- optional MCP overlays ----
// Each file in mcp/ is one optional Cloudflare MCP server overlay (plus
// all.yml = the combined opt-in). The shipped plugin stays at one server for
// Codex parity; these are user-opt-in --patch layers.
const mcpDir = join(pkg, 'mcp')
const mcpFiles = (await readdir(mcpDir)).filter(f => f.endsWith('.yml')).sort()
const EXPECTED_MCP_OVERLAYS = [
  'ai-gateway.yml', 'all.yml', 'audit-logs.yml', 'autorag.yml', 'bindings.yml',
  'blog.yml', 'browser.yml', 'builds.yml', 'casb.yml', 'containers.yml',
  'demo-day.yml', 'dex.yml', 'dns-analytics.yml', 'docs.yml', 'logpush.yml',
  'observability.yml', 'radar.yml',
]
assert.deepEqual(mcpFiles, EXPECTED_MCP_OVERLAYS, 'optional MCP overlay set changed')

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
for (const f of mcpFiles) {
  const content = await readFile(join(mcpDir, f), 'utf8')
  const names = [...content.matchAll(/serverName: ([\w-]+)/g)].map(m => m[1])
  const urls = [...content.matchAll(/url: (\S+)/g)].map(m => m[1])
  assert.ok(names.length > 0, 'no serverName in ' + f)
  assert.equal(names.length, urls.length, 'serverName/url mismatch in ' + f)
  for (const n of names) assert.match(n, SERVER_NAME, 'invalid serverName in ' + f + ': ' + n)
  for (const u of urls) assert.match(u, /^https:\/\/[a-z0-9.-]+\.cloudflare\.com\/mcp$/, 'unexpected URL in ' + f + ': ' + u)
}

// ---- Code Mode default guidance ----
// The cloudflare skill instructs the agent to default to the Code Mode MCP
// server; the guide must exist and name all three DSH tool names.
const codeModeGuide = join(pkg, 'skills', 'cloudflare', 'references', 'api', 'codemode-mcp.md')
const guide = await readFile(codeModeGuide, 'utf8')
for (const tool of [
  'mcp__cloudflare-api__search',
  'mcp__cloudflare-api__execute',
  'mcp__cloudflare-api__docs',
]) {
  assert.ok(guide.includes(tool), 'codemode-mcp.md missing tool: ' + tool)
}

console.log('parity ok: 11 skills (9 vendored Codex + think + flue), 2 commands, 1 mcp server, ' + mcpFiles.length + ' optional MCP overlays, Code Mode default guidance')
