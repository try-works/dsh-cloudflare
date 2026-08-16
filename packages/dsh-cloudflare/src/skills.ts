/**
 * Bundled skill provider for the Codex Cloudflare plugin surface.
 *
 * Loads the nine vendored Cloudflare skill bundles (SKILL.md + references/
 * assets/) and registers them on `ctx.skills` with a bundled-rank candidate
 * per skill, exactly mirroring the skill catalog Codex's cloudflare plugin
 * exposes. Resource bases point at the vendored skill directories so each
 * SKILL.md's relative `references/...` and `assets/...` paths resolve.
 *
 * @module @try-works/dsh-cloudflare
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  BUNDLED_SKILL_RANK,
  type SkillCandidate,
  type SkillDefinition,
  type SkillProvider,
} from '@deepseek-ai/dsh-skill'
import { VENDORED_SKILLS } from './manifest.ts'

export const name = 'cloudflare-skills'
export const inject = ['skills']

/** Provider name registered on `ctx.skills`; the catalog shows this. */
export const PROVIDER_NAME = 'cloudflare'
/** Skill origin label; `bundled` matches the packaged skill provider convention. */
export const SOURCE = 'bundled'

const SKILLS_ROOT = new URL('../skills/', import.meta.url)

/** Absolute directory for one vendored skill bundle. */
function skillDir(skillName: string): URL {
  return new URL(`./${skillName}/`, SKILLS_ROOT)
}

/** Build one stable candidate for a vendored skill. */
function candidate(skillName: string, description: string): SkillCandidate {
  const base = fileURLToPath(skillDir(skillName))
  return {
    name: skillName,
    description,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER_NAME,
    source: SOURCE,
    rank: BUNDLED_SKILL_RANK,
    locator: skillName,
    resourceBase: { kind: 'directory', path: base },
  }
}

/** Load the SKILL.md body for one candidate, minus its YAML frontmatter. */
async function loadBody(skillName: string): Promise<string> {
  const raw = await readFile(new URL('./SKILL.md', skillDir(skillName)), 'utf8')
  return stripFrontmatter(raw)
}

/** Remove the leading `---` YAML frontmatter block, if present. */
function stripFrontmatter(raw: string): string {
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return raw
  const firstLine = raw.slice(0, firstLineEnd).replace(/\r$/, '')
  if (firstLine !== '---') return raw
  const closing = raw.indexOf('\n---', firstLineEnd + 1)
  if (closing < 0) return raw
  const bodyStart = raw.indexOf('\n', closing + 1)
  return raw.slice(bodyStart < 0 ? raw.length : bodyStart + 1)
}

const CANDIDATES: readonly SkillCandidate[] = VENDORED_SKILLS.map(skill =>
  candidate(skill.name, skill.description),
)

const provider: SkillProvider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve(CANDIDATES),
  async get(candidate): Promise<SkillDefinition | undefined> {
    const name = typeof candidate.locator === 'string' ? candidate.locator : candidate.name
    const content = await loadBody(name)
    return {
      name: candidate.name,
      description: candidate.description,
      invocation: candidate.invocation,
      provider: PROVIDER_NAME,
      source: SOURCE,
      ...candidate.resourceBase === undefined ? {} : { resourceBase: candidate.resourceBase },
      content,
    }
  },
}

/** Register the Cloudflare skill provider. */
export function apply(ctx: Context): void {
  ctx.skills.registerProvider(() => provider)
}
