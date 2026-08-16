/**
 * Slash commands mirroring the Codex Cloudflare plugin's `/cloudflare:build-agent`
 * and `/cloudflare:build-mcp`.
 *
 * Codex commands are user-invocable slash commands that, when run, hand the
 * model a Markdown brief that points it at the relevant skill bundle. In DSH,
 * `ctx.commands` handlers run without a model turn; to preserve the Codex
 * behavior (invoke → model does the work), the handler expands the vendored
 * Codex command brief and submits it as a follow-up turn on the receiving
 * agent, then acknowledges.
 *
 * The command body files are the verbatim Codex command Markdown (frontmatter
 * included) vendored under `commands/`.
 *
 * @module @try-works/dsh-cloudflare
 */

import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

export const name = 'cloudflare-commands'
export const inject = ['commands']

const COMMANDS_DIR = new URL('../commands/', import.meta.url)

interface CommandSpec {
  readonly name: string
  readonly description: string
  readonly hint: string
  readonly file: string
}

// DSH command names are `[a-z][a-z0-9_-]*` (no colon), so the Codex
// `/cloudflare:build-agent` and `/cloudflare:build-mcp` surface as the
// hyphenated DSH equivalents below. The briefs and behavior are identical.
const SPECS: readonly CommandSpec[] = [
  {
    name: 'cloudflare-build-agent',
    description: 'Build an AI agent on Cloudflare using the Agents SDK',
    hint: '[agent-description]',
    file: 'build-agent.md',
  },
  {
    name: 'cloudflare-build-mcp',
    description: 'Build a remote MCP server on Cloudflare with tools and OAuth',
    hint: '[mcp-description]',
    file: 'build-mcp.md',
  },
]

/** Strip the leading `---` YAML frontmatter block, if present. */
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

/** Expand `$ARGUMENTS` exactly like the Codex command runtime does. */
function renderBrief(body: string, rawInput: string): string {
  const args = rawInput.trim()
  return body.replaceAll('$ARGUMENTS', args.length > 0 ? args : '<no description provided>')
}

async function loadBrief(file: string): Promise<string> {
  const raw = await readFile(new URL(file, COMMANDS_DIR), 'utf8')
  return stripFrontmatter(raw)
}

/** Register the two Cloudflare commands once. */
export function apply(ctx: Context): void {
  for (const spec of SPECS) {
    ctx.commands.register({
      name: spec.name,
      description: spec.description,
      input: { hint: spec.hint },
      handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
        const brief = renderBrief(await loadBrief(spec.file), invocation.rawInput)
        invocation.agent.followup(createUserMessage({
          source: { kind: 'plugin', plugin: 'dsh-cloudflare', form: 'instructions' },
          content: [{ type: 'text', text: brief }],
        }))
        return { kind: 'success' }
      },
    })
  }
}
