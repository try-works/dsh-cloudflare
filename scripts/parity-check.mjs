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

console.log('parity ok: 11 skills (9 vendored Codex + think + flue), 2 commands, 1 mcp server')
