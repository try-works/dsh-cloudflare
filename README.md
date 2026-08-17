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
(`https://mcp.cloudflare.com/mcp`) — the Cloudflare **Code Mode** server
that covers the full Cloudflare API (2,500+ endpoints in ~1,000 tokens).

**The agent defaults to this server for live Cloudflare work.** The `cloudflare` and `wrangler` skills instruct the model to prefer Code Mode's
search → execute flow over wrangler/curl/SDKs when inspecting or acting on an
account. Code Mode exposes three tools, which DSH names:

| Cloudflare tool | DSH tool | Purpose |
| --- | --- | --- |
| `search` | `mcp__cloudflare-api__search` | Find endpoints by running JS against the OpenAPI spec |
| `execute` | `mcp__cloudflare-api__execute` | Call the API via `cloudflare.request()` |
| `docs` | `mcp__cloudflare-api__docs` | Search the live Cloudflare docs |

Full guide and code patterns: `packages/dsh-cloudflare/skills/cloudflare/references/api/codemode-mcp.md`.

Cloudflare also publishes a set of focused, domain-specific MCP servers in
[cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare).
For 1:1 Codex parity this plugin ships only Code Mode; add the rest per
profile with the `--patch` overlay below (each is one
`@deepseek-ai/dsh-mcp-client` row).

#### Cloudflare MCP server catalog

| Server | Purpose | URL |
| --- | --- | --- |
| Code mode | Full Cloudflare API via code execution (minimal token overhead) | `https://mcp.cloudflare.com/mcp` |
| AI Gateway | Search logs; prompt/response details | `https://ai-gateway.mcp.cloudflare.com/mcp` |
| Audit Logs | Query audit logs, generate review reports | `https://auditlogs.mcp.cloudflare.com/mcp` |
| AutoRAG | Search and query account AutoRAG instances | `https://autorag.mcp.cloudflare.com/mcp` |
| Browser Run | Fetch pages, convert to markdown, screenshots | `https://browser.mcp.cloudflare.com/mcp` |
| Cloudflare Blog | Search and read Cloudflare Blog posts | `https://blog.mcp.cloudflare.com/mcp` |
| Cloudflare One CASB | SaaS security misconfiguration checks | `https://casb.mcp.cloudflare.com/mcp` |
| Container | Spin up a sandbox dev environment | `https://containers.mcp.cloudflare.com/mcp` |
| Demo Day | Minimal example Cloudflare MCP server | `https://demo-day.mcp.cloudflare.com/mcp` |
| Digital Experience Monitoring | Critical-application health insight | `https://dex.mcp.cloudflare.com/mcp` |
| DNS Analytics | DNS performance and issue debugging | `https://dns-analytics.mcp.cloudflare.com/mcp` |
| Documentation | Up-to-date Cloudflare reference info | `https://docs.mcp.cloudflare.com/mcp` |
| Logpush | Quick summaries of Logpush job health | `https://logs.mcp.cloudflare.com/mcp` |
| Observability | App logs and analytics debugging | `https://observability.mcp.cloudflare.com/mcp` |
| Radar | Cloudflare Radar internet insights | `https://radar.mcp.cloudflare.com/mcp` |
| Workers Bindings | Workers storage/AI/compute primitives | `https://bindings.mcp.cloudflare.com/mcp` |
| Workers Builds | Manage Cloudflare Workers Builds | `https://builds.mcp.cloudflare.com/mcp` |

References:
[Code Mode MCP blog post](https://blog.cloudflare.com/code-mode-mcp/),
[github.com/cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare),
[Cloudflare MCP servers docs](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/).

#### Adding more MCP servers per profile (optional)

The package ships one ready-to-apply overlay per optional server under
`packages/dsh-cloudflare/mcp/` (plus `all.yml` to opt in to every
domain-specific server at once). The shipped `cordis.patch.yml` intentionally
stays at one server for Codex parity — these overlays are opt-in:

```sh
# One server
dsh --profile <profile> --patch packages/dsh-cloudflare/mcp/docs.yml

# Several servers (--patch is repeatable)
dsh --profile <profile> \
  --patch packages/dsh-cloudflare/mcp/docs.yml \
  --patch packages/dsh-cloudflare/mcp/observability.yml

# Every domain-specific server
dsh --profile <profile> --patch packages/dsh-cloudflare/mcp/all.yml
```

| Overlay file | Server |
| --- | --- |
| `mcp/ai-gateway.yml` | AI Gateway |
| `mcp/audit-logs.yml` | Audit Logs |
| `mcp/autorag.yml` | AutoRAG |
| `mcp/browser.yml` | Browser Run |
| `mcp/blog.yml` | Cloudflare Blog |
| `mcp/casb.yml` | Cloudflare One CASB |
| `mcp/containers.yml` | Container |
| `mcp/demo-day.yml` | Demo Day |
| `mcp/dex.yml` | Digital Experience Monitoring |
| `mcp/dns-analytics.yml` | DNS Analytics |
| `mcp/docs.yml` | Documentation |
| `mcp/logpush.yml` | Logpush |
| `mcp/observability.yml` | Observability |
| `mcp/radar.yml` | Radar |
| `mcp/bindings.yml` | Workers Bindings |
| `mcp/builds.yml` | Workers Builds |
| `mcp/all.yml` | All of the above |

Each overlay is a plain `cordis.patch.yml`-format list with a single
`@deepseek-ai/dsh-mcp-client` row (id/name `cloudflare-<slug>`). They compose
cleanly after the profile layer and do not alter the always-on
`cloudflare-api` row.

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
