# dsh-cloudflare

DeepSeek Harness (DSH) plugin providing **1:1 parity with the Codex Cloudflare
plugin**, as published in
[openai/plugins `plugins/cloudflare`](https://github.com/openai/plugins/tree/main/plugins/cloudflare).

It bundles the Codex plugin's complete skill surface and its two slash commands,
adds two further Cloudflare skills (`think` and `flue`), and ships a
ready-to-apply `cordis.yml` for its single MCP server.

## What it provides

### Skills

Eleven Cloudflare skill bundles, discovered as the `cloudflare` provider. The
first nine are vendored verbatim from the Codex plugin; `think` and `flue`
are authored additions covering Cloudflare technologies the Codex plugin does
not yet ship (see `PROVENANCE.md`).

| Skill | Purpose |
| --- | --- |
| `agents-sdk` | Build AI agents on Cloudflare Workers using the Agents SDK |
| `building-ai-agent-on-cloudflare` | End-to-end agent building workflow |
| `building-mcp-server-on-cloudflare` | Build remote MCP servers on Workers |
| `cloudflare` | Comprehensive Cloudflare platform skill |
| `durable-objects` | Stateful coordination with Durable Objects |
| `flue` | Build/deploy Flue agents on Cloudflare (Flue Durable Objects, Workers AI) |
| `sandbox-sdk` | Secure sandboxed code execution |
| `think` | Durable chat agents with `@cloudflare/think` |
| `web-perf` | Web performance auditing via Chrome DevTools MCP |
| `workers-best-practices` | Workers production best-practice review |
| `wrangler` | Wrangler CLI usage and configuration |

The catalog is generated from the vendored `SKILL.md` frontmatter by
`scripts/gen-manifest.mjs`, so the DSH catalog stays a single source of truth
for every skill directory (see `PROVENANCE.md`).

### Slash commands

The Codex commands `/cloudflare:build-agent` and `/cloudflare:build-mcp`
map to the DSH command-name grammar (which forbids `:`), as:

- `/cloudflare-build-agent`
- `/cloudflare-build-mcp`

Each handler expands the verbatim Codex command brief (substituting
`$ARGUMENTS`) and queues it as a follow-up turn on the receiving agent, then
acknowledges — preserving Codex's invoke→model-does-the-work behavior.

### MCP server

The Codex plugin declares one MCP server. DSH models one MCP server per
`@deepseek-ai/dsh-mcp-client` instance, so the shipped patch layer inserts
one `cloudflare-api` mcp-client row beside the plugin row. The
`cloudflare-api` server mirrors `.mcp.json`
(`https://mcp.cloudflare.com/mcp`).

## Install

Published to npm as [`@try-works/dsh-cloudflare`](https://www.npmjs.com/package/@try-works/dsh-cloudflare).

`@try-works/dsh-cloudflare` is a DSH **bundle** as well as a plugin: its
`package.json` declares `dsh.bundle.patch` pointing at the shipped
`cordis.patch.yml`, which inserts the plugin row plus the MCP client row.
Installing it as a plugin therefore auto-mounts the whole layer:

```sh
dsh plugin --profile <profile> add @try-works/dsh-cloudflare
```

`dsh plugin` forwards to pnpm in the profile directory, then reconciles the
package into `dsh.profile.bundles` because it declares `dsh.bundle`; on the
next boot the profile composes the shipped `cordis.patch.yml` over its
layers. (Installing it as a plain dependency — e.g. `pnpm add
@try-works/dsh-cloudflare` — stays possible but only warns and does not mount
the layer; apply the repo-root `cordis.yml` overlay in that case.)

For a manual `--patch` install, the repo-root `cordis.yml` carries the same
two rows:

```sh
dsh --profile <profile> --patch ./cordis.yml
```

Either path requires the profile to already provide `ctx.skills`,
`ctx.commands`, and `ctx.tools` (the shipped `@deepseek-ai/dsh-base`
bundle does), so the skills, slash commands, and MCP tools mount cleanly.

## How DSH becomes aware of the plugin

DSH has no plugin auto-discovery: a plugin becomes known to the runtime when a
loader entry row names it, i.e. when its `name` appears in the composed
entry tree. The bundle `dsh.plugin add` path and the `--patch` overlay are
both just ways of adding that row; once the row is composed, the plugin's
`apply` registers its skills (`ctx.skills`) and commands
(`ctx.commands`), which is what makes them available to the model — the skill
catalog (`@deepseek-ai/dsh-tool-skill`) and the command registry surface
registered skills and commands to the agent.

`AGENTS.md` is **not** a plugin registration mechanism and does not need to
be edited for the plugin to work. DSH's
`@deepseek-ai/dsh-agent-instructions` loads `AGENTS.md`/`CLAUDE.md` only
from the project tree and `$DSH_HOME`; it has no plugin-inventory input.
Adding a note to an `AGENTS.md` is an optional per-workspace convention, not
something this plugin requires or performs.

## Development

```sh
node scripts/gen-manifest.mjs   # regenerate src/manifest.ts from vendored SKILL.md
node scripts/typecheck.mjs      # tsc -b packages/dsh-cloudflare (builds lib/)
node scripts/parity-check.mjs   # assert 11 skills / 2 commands / 1 MCP server
```

The package builds standalone: `npm install` inside
`packages/dsh-cloudflare` (devDependencies include `typescript` and
`@types/node`, and the peers resolve from npm) then `npm run build` /
`npm run prepack` emits `lib/`. `scripts/typecheck.mjs` first looks for a
package-local `typescript`, and otherwise falls back to the DeepSeek Harness
checkout at `DSH_HARNESS` (default `D:/deepseek-harness`).

## Provenance & license

Vendored skills/commands originate from
[openai/plugins](https://github.com/openai/plugins) at commit
`11c74d6ba24d3a6d48f54a194cd00ef3beea18f9` (plugin version `0.1.2`). See
`PROVENANCE.md` for the full record. The package and plugin code are
Apache-2.0 (see the repo-root `LICENSE`); vendored skill content carries its
own licenses, Apache-2.0 for the Cloudflare and Flue bundles (see
`packages/dsh-cloudflare/skills/*/LICENSE.txt`).
