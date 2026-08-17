# Provenance

The Cloudflare skill content in this repository is vendored from the canonical
Codex Cloudflare plugin as published by OpenAI.

- **Upstream source**: `https://github.com/openai/plugins`, path `plugins/cloudflare`
- **Commit pinned**: `11c74d6ba24d3a6d48f54a194cd00ef3beea18f9` ("Add ClickUp website URL (#384)")
- **Upstream version**: `0.1.2` (from `plugin.json`)
- **License**: this package and its plugin code are Apache-2.0 (repo-root
  `LICENSE`; package `license` field). The vendored skill bundles carry
  their own licenses — Apache-2.0 for `cloudflare`, `agents-sdk`, and
  `wrangler` (`skills/*/LICENSE.txt`); the Codex plugin manifest (kept
  verbatim except repository/author/license metadata) originally declared
  MIT.

The vendored surface matches the Codex plugin exactly:

- 9 skills (directory bundles, each `SKILL.md` + references/assets)
- 2 slash commands (`build-agent`, `build-mcp`)
- 1 MCP server (`cloudflare-api` → `https://mcp.cloudflare.com/mcp`)
- plugin icons (`assets/cloudflare.png`, `assets/cloudflare-small.svg`)

The plugin manifest is preserved at
`packages/dsh-cloudflare/plugin.json` with the skills/mcpServers/interface
surface verbatim; only the `repository`, `author`, `homepage`, and
`license` metadata were updated to point at this repository and its
Apache-2.0 license.

## Authored additions: `think` and `flue`

The Codex plugin does not ship a skill for Cloudflare Think or for Flue. This
package adds two authored `SKILL.md` bundles (discovered through the same
`cloudflare` skill provider) so DSH users get those skills out of the box.
They are original summaries authored from the upstream documentation — not
copied verbatim — and each carries its own license provenance:

- **`think`** — `@cloudflare/think`, an opinionated chat-agent base class on
  the Agents SDK. Source documentation lives in
  `cloudflare/agents` (`docs/think/`), which is MIT-licensed
  (https://github.com/cloudflare/agents).
- **`flue`** — the open TypeScript agent framework (Astro team) on the Pi
  harness, deployed to Cloudflare as Flue Durable Objects. Source
  documentation lives in `withastro/flue` and
  `https://flueframework.com/docs/guide/targets/cloudflare/`, which is
  Apache-2.0-licensed (https://github.com/withastro/flue).

The parity check counts these separately: `11 skills (9 vendored Codex +
think + flue)`, keeping the vendored surface auditable against the upstream
plugin while the authored additions are clearly identified.

## Authored additions: Code Mode MCP default

Cloudflare's Code Mode MCP server (`cloudflare-api` →
`https://mcp.cloudflare.com/mcp`) is the plugin's **single MCP server**, and
the Codex plugin already relied on its `search()`/`execute()` model. This
repository adds DSH-specific guidance so the agent **defaults to those tools**
for live account work (they surface as `mcp__cloudflare-api__search`,
`mcp__cloudflare-api__execute`, and `mcp__cloudflare-api__docs`). That
guidance is authored, not vendored:

- `skills/cloudflare/SKILL.md` — "Live API Access — Code Mode MCP (default)"
  section plus a retrieval-sources row.
- `skills/cloudflare/references/api/codemode-mcp.md` — full guide and code
  patterns (new authored file).
- `skills/cloudflare/references/api/README.md` — decision-tree/reading-order
  links into the guide.
- `skills/cloudflare/agents/openai.yaml` and
  `skills/wrangler/SKILL.md` — prompt-level "prefer Code Mode MCP" notes.

These are additive guidance edits to otherwise-vendored files; the vendored
**surface** (11 skills, 2 commands, 1 MCP server) is unchanged and still
audited by `scripts/parity-check.mjs`.

## Authored additions: optional MCP overlays

`packages/dsh-cloudflare/mcp/` ships one ready-to-apply `--patch` overlay
per Cloudflare domain-specific MCP server (16 files) plus `all.yml`. These
are authored from the
[cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)
catalog and are **opt-in** — the shipped surface stays at the single
`cloudflare-api` Code Mode server for 1:1 Codex parity.

## DSH packaging

The package is a DSH **bundle**: `packages/dsh-cloudflare/package.json`
declares `dsh.bundle.patch: ./cordis.patch.yml`, so
`dsh plugin --profile <p> add @try-works/dsh-cloudflare` reconciles it into
`dsh.profile.bundles` and composes `packages/dsh-cloudflare/cordis.patch.yml`
(the plugin row plus the `cloudflare-api` mcp-client row) over the profile.
The repo-root `cordis.yml` is the equivalent standalone `--patch` overlay;
keep the two in sync. The mcp-client row is why
`@deepseek-ai/dsh-mcp-client` is a runtime `dependency` of the package.

Regenerate `packages/dsh-cloudflare/src/manifest.ts` from the vendored skill
frontmatter with:

```sh
node scripts/gen-manifest.mjs
```

The published artifact is built before packing (`prepack` runs
`scripts/typecheck.mjs`, which emits `lib/`); the tarball ships
`lib/*.js`, `lib/*.d.ts`, `skills`, `commands`, `assets`,
`plugin.json`, `.mcp.json`, `src`, `mcp`, and `cordis.patch.yml`
plus the package `README.md` and `LICENSE`.
