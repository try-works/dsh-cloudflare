# @try-works/dsh-cloudflare

DeepSeek Harness (DSH) plugin providing **1:1 parity with the Codex Cloudflare
plugin** — 11 Cloudflare skill bundles (9 vendored from
[openai/plugins](https://github.com/openai/plugins/tree/main/plugins/cloudflare)
plus authored `think` and `flue` skills), the two Cloudflare slash commands,
and the official Cloudflare API MCP server.

## Install

`@try-works/dsh-cloudflare` is a DSH **bundle**: its package.json declares
`dsh.bundle.patch` pointing at the shipped `cordis.patch.yml`, which mounts
the plugin row plus the `cloudflare-api` MCP client row. Installing it as a
plugin therefore auto-mounts the whole layer:

```sh
dsh plugin --profile <profile> add @try-works/dsh-cloudflare
```

`dsh plugin` forwards to pnpm in the profile directory, then reconciles the
package into `dsh.profile.bundles` because it declares `dsh.bundle`. On the
next boot the profile composes `cordis.patch.yml` over its layers.

Requires the profile to already provide `ctx.skills`, `ctx.commands`, and
`ctx.tools` (the shipped `@deepseek-ai/dsh-base` bundle does).

## What it provides

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

Slash commands (DSH grammar): `/cloudflare-build-agent` and
`/cloudflare-build-mcp`.

MCP server: `cloudflare-api` at `https://mcp.cloudflare.com/mcp` (one
`@deepseek-ai/dsh-mcp-client` instance per the DSH convention) — Cloudflare's
**Code Mode** server covering the full API (2,500+ endpoints in ~1,000
tokens).

The agent **defaults to this server** for live Cloudflare work: the
`cloudflare` and `wrangler` skills instruct it to use Code Mode's
search → execute flow before wrangler/curl/SDKs. The three Code Mode tools
surface in DSH as:

| Cloudflare tool | DSH tool | Purpose |
| --- | --- | --- |
| `search` | `mcp__cloudflare-api__search` | Find endpoints against the OpenAPI spec |
| `execute` | `mcp__cloudflare-api__execute` | Call the API via `cloudflare.request()` |
| `docs` | `mcp__cloudflare-api__docs` | Search the live Cloudflare docs |

See `skills/cloudflare/references/api/codemode-mcp.md` for the full guide.

For 1:1 Codex parity this package ships only Code Mode by default. Cloudflare
also publishes focused domain-specific MCP servers
([cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)),
and this package ships one ready-to-apply `--patch` overlay for each under
`mcp/` (plus `mcp/all.yml` for all of them). Opt in per profile:

```sh
# One server
dsh --profile <profile> --patch <node_modules>/@try-works/dsh-cloudflare/mcp/docs.yml

# Every domain-specific server
dsh --profile <profile> --patch <node_modules>/@try-works/dsh-cloudflare/mcp/all.yml
```

`--patch` is repeatable; each overlay is one `@deepseek-ai/dsh-mcp-client`
row and composes cleanly beside the always-on `cloudflare-api` Code Mode row.
See the repository README for the full catalog table.

## License

Apache-2.0. Vendored Cloudflare skill content carries its own licenses
(`skills/*/LICENSE.txt`); see PROVENANCE.md in the repository for the full
record.
