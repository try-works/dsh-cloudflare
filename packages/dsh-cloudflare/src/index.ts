/**
 * DSH plugin providing 1:1 parity with the Codex Cloudflare plugin.
 *
 * Mounting this single plugin contributes:
 *
 * - the `cloudflare` skill provider (9 vendored Cloudflare skill bundles), and
 * - the `cloudflare-build-agent` / `cloudflare-build-mcp` slash commands
 *   (the Codex `/cloudflare:build-agent` / `/cloudflare:build-mcp`, renamed
 *   to the DSH command-name grammar).
 *
 * It deliberately does NOT contribute MCP servers itself: in DSH each MCP
 * server is one `@deepseek-ai/dsh-mcp-client` instance. The repository ships a
 * ready-to-use `cordis.yml` that mounts both this plugin and the
 * `cloudflare-api` MCP client, reproducing the Codex plugin's single MCP server.
 *
 * @module @try-works/dsh-cloudflare
 */

import type { Context } from '@deepseek-ai/cordis'
import * as skills from './skills.ts'
import * as commands from './commands.ts'

export { name as skillsPluginName, PROVIDER_NAME, SOURCE } from './skills.ts'
export { VENDORED_SKILLS } from './manifest.ts'
export type { VendoredSkill } from './manifest.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'cloudflare'
/** Services required before this plugin applies. */
export const inject = ['skills', 'commands']

/** Mount the skill provider and the slash commands. */
export function apply(ctx: Context): void {
  ctx.plugin(skills)
  ctx.plugin(commands)
}
