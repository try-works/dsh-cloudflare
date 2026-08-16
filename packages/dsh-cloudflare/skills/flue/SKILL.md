---
name: flue
description: Build and deploy Flue agents on Cloudflare — the open TypeScript agent framework (from the Astro team) built on the Pi harness and the Cloudflare Agents SDK. Load when creating Flue agents with 'use agent', deploying Flue to Cloudflare (Flue Durable Objects, wrangler migrations), wiring Workers AI/AI Gateway, Cloudflare Sandbox or Cloudflare Computer, or using the Flue CLI (@flue/cli, flue add, flue run). Biases towards retrieval from Cloudflare and Flue docs over pre-trained knowledge.
---

# Cloudflare Flue

Flue is the open agent framework from the Astro team. Agents are TypeScript
functions using a React-like hooks API; on Cloudflare each agent runs inside its
own Durable Object on the Agents SDK. Describe what the agent knows — model,
skills, sandbox, instructions — and it works autonomously.

**For the underlying primitives load the `agents-sdk` and `durable-objects` skills first.**

Your knowledge of Flue and Cloudflare may be outdated. **Prefer retrieval over
pre-training** for API signatures, config shapes, and migration rules.

## Retrieval Sources

| Source | URL |
|--------|-----|
| Flue docs — Cloudflare target | `https://flueframework.com/docs/guide/targets/cloudflare/` |
| Flue docs — getting started | `https://flueframework.com/docs/guide/getting-started/` |
| Flue GitHub | `https://github.com/withastro/flue` |
| Cloudflare blog (Flue) | `https://blog.cloudflare.com/agents-platform-flue-sdk/` |
| Agents SDK docs | `https://developers.cloudflare.com/agents/` |
| **Verified** | 2026-07 against Flue Cloudflare beta (`flueframework.com/docs/guide/targets/cloudflare/`) |

## Quick Start

### Prerequisites

- Node.js >= 22.19.0
- LLM provider API key(s) (except Workers AI — no key needed on Cloudflare)

### Install and configure

```sh
npm install @flue/runtime @flue/cli
```

`flue.config.ts`:

```typescript
import { defineConfig } from '@flue/runtime/config';
export default defineConfig({ target: 'cloudflare' });
```

### First agent (src/agents/assistant.ts)

```typescript
// The 'use agent' directive marks Assistant() as a Flue agent.
'use agent';
import { useModel } from '@flue/runtime';

export function Assistant() {
  useModel('cloudflare/@cf/moonshotai/kimi-k2.6'); // or 'anthropic/claude-haiku-4-5'
  return 'You are a helpful assistant. Keep replies short.';
}
```

The returned string is the agent's system instructions. Run locally:

```sh
npx flue run src/agents/assistant.ts --message "Say hello in five words or fewer."
```

## The three-layer stack

- **Framework (Flue)** — project structure, conventions, integrations, CLI, DX.
- **Harness (Pi)** — the agentic loop: tools, results, context management.
- **Runtime/platform (Cloudflare Agents SDK)** — compute, state, storage.

## Cloudflare target mechanics

Each agent becomes a Durable Object; the build is owned by Vite
(`flue()` + `@cloudflare/vite-plugin`, with `flue()` first in
`vite.config.ts`).

### Generated Durable Objects

Flue generates a Durable Object class and a Wrangler binding per exported
`'use agent'` function — one per function, so a module with several agents
produces several classes. Identity comes from the exported function's name (or
its `agentName` static override):

```text
export function SupportChat() {…}
  -> class FlueSupportChatAgent, binding env.FLUE_SUPPORT_CHAT_AGENT
```

Camel boundaries split in the binding name (`SupportChat` →
`FLUE_SUPPORT_CHAT_AGENT`, never `FLUE_SUPPORTCHAT_AGENT`). Renaming the
function is a **storage-identity change** unless `agentName` pins it; renaming
the file changes nothing. On a rename, declare `renamed_classes` in the next
migration so stored conversations are preserved under the new name —
`deleted_classes` destroys the data.

Conversation streams, immutable attachments, and accepted submissions are stored
in the owning Durable Object's SQLite automatically. The Cloudflare target does
**not** use `db.ts` (a source-root `db.ts` is rejected at build time).

### wrangler.jsonc

Do not hand-author Flue's generated `FLUE_*` bindings. Your authored
`wrangler.jsonc` declares the Worker name, compatibility settings, and
migrations only:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-flue-worker",
  "compatibility_date": "<today>",
  "compatibility_flags": ["nodejs_compat"],  // only when the agent uses Node.js APIs
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["FlueSupportChatAgent"] }
  ]
}
```

`nodejs_compat` is required **only when the agent uses Node.js APIs** (some
sandbox/fs features). Relying on it unnecessarily can conflict with other
compatibility flags — see the `workers-best-practices` skill's
compatibility-flag guidance before adding it.

Flue merges its contributions into a generated `.flue-vite.wrangler.jsonc`
that the Cloudflare Vite plugin consumes; your authored file is never modified.
Add `.flue-vite/` and `.flue-vite.wrangler.jsonc` to `.gitignore`.

### Managing migrations

Migration history is user-authored and append-only. Adding an agent is always a
triple: the `'use agent'` export, the mount in `app.ts` (unless
dispatch-only), and a new migration entry with a unique tag:

```jsonc
{
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["FlueSupportChatAgent"] },
    { "tag": "v2", "new_sqlite_classes": ["FlueTriageAgent"] }
  ]
}
```

- Never rewrite or reorder deployed migration entries.
- Generated agents are SQLite-backed: introduce them via `new_sqlite_classes`,
  not legacy `new_classes`.
- Use `renamed_classes` when an agent's identity changes (function renamed or
  `agentName` edited); it preserves stored conversations under the new name.
- Use `deleted_classes` when removing a previously deployed agent, or Wrangler
  fails because migration history references a class the Worker no longer
  exports.

Re-mounting an agent at a different URL in `app.ts` needs no migration — the
mount path is not part of the storage identity.

## Durable agent execution

All accepted input for one conversation (direct HTTP prompt and `dispatch(...)`
input) enters the same durable per-conversation queue; admission returns first,
then the response runs on the next alarm tick. Consequences:

- Platform observability sees agent work (Workers Logs/Traces); a default
  `createCloudflareTracing()` adds agent-level spans.
- Scheduled callbacks (`schedule()`/`scheduleEvery()`) wait for a running
  response (one alarm at a time); `queue()` and steering are unaffected.
- CPU limits are per invocation — raise `limits.cpu_ms` only if an agent
  computes heavily.
- After interruption, Flue decides from stored input + conversation progress:
  requeues only when the input provably was not applied, recognizes completed
  output, and records an interruption instead of repeating uncertain work.

## Workers AI and AI Gateway

`useModel('cloudflare/@cf/moonshotai/kimi-k2.6')` uses Workers AI directly —
no API key; auth and billing follow the Worker account (free tier included).
Flue enables AI Gateway by default for all `cloudflare/...` models (caching,
request logging, rate limiting, budget controls). Customize, disable, or target
a named gateway by re-registering the `cloudflare` provider in `app.ts`.

## Sandboxes and workspaces

- **Default**: a lightweight in-memory virtual sandbox — fine for
  prompt-and-response agents and tools-only work.
- **Cloudflare Computer** (`flue add sandbox cloudflare-computer`): a durable,
  SQLite-backed Workspace in the agent's own Durable Object with shell execution
  through a just-bash Dynamic Worker; standard `bash`/`grep`/`glob`/
  `read`/`write`/`edit` tools, but no native binaries or package managers.
  Use when a durable workspace + shell-expressible work is enough.
- **Cloudflare Sandbox** (container-backed Linux): for git, package installs,
  native binaries, or a real filesystem. Export the sandbox Durable Object class
  from `cloudflare.ts`, declare its binding + container image in
  `wrangler.jsonc`, and wrap `getSandbox(env.Sandbox, id)` with
  `cloudflareSandbox(...)` from `@flue/runtime/cloudflare`. Use when you need
  a full Linux environment with native binaries.

## Extending agents on Cloudflare

Flue owns each generated Durable Object class. For native Agents SDK
capabilities (`onStart()`, `schedule()`, `scheduleEvery()`, `queue()`),
export a `cloudflare` extension descriptor from the agent module:

```typescript
'use agent';
import { useModel } from '@flue/runtime';
import { extend } from '@flue/runtime/cloudflare';

export function Assistant() {
  useModel('anthropic/claude-sonnet-4-6');
}

export const cloudflare = extend({
  base: (Base) => class extends Base {
    async onStart() {
      await this.scheduleEvery(60, 'heartbeat');
    }
    async heartbeat() {
      this.setState({ ...this.state, lastHeartbeatAt: Date.now() });
    }
  }
});
```

- `base` receives the Agents SDK Agent base class; it is applied before the
  final generated Durable Object subclass.
- `wrap` receives the final generated class (e.g. Sentry instrumentation).
- The `cloudflare` export is per-module (applies to every agent in that file).
- Do not override Flue-owned `fetch()`, `onRequest()`,
  `onFiberRecovered()`, or `alarm()` methods.
- Do not add a Worker cron trigger just to reach `scheduleEvery(...)`; Agents
  SDK scheduling runs inside the generated Durable Object.

### cloudflare.ts entrypoint

A source-root `cloudflare.ts` holds Worker-level Cloudflare code. Any named
export becomes a top-level Worker export (e.g. application-owned Durable
Objects); the default export may contribute non-HTTP handlers (e.g. a cron
`scheduled`). Declare their bindings and migrations in `wrangler.jsonc`.

### Private agents over service bindings

A Flue Worker without a public route can be reached via a service binding. Point
the Flue Agent SDK client's `fetch` option at the binding:

```typescript
import { createFlueClient } from '@flue/sdk';
type Env = { AGENT_APP: Fetcher };

const convo = createFlueClient({
  url: 'https://agent.internal/agents/support/ticket-42', // host never dialed
  fetch: (input, init) => env.AGENT_APP.fetch(new Request(input, init)),
});
const admission = await convo.send({ message: { kind: 'user', body: 'Summarize.' } });
```

Attachments are the exception: `convo.attachmentUrl(id)` returns a URL on the
placeholder host the client does not fetch; forward it through the same fetcher.

### Wrapping a Flue agent as a tool

A Flue agent is addressable programmatically without a chat surface, using
`dispatch()` / `init()` from `@flue/runtime`. For a tool-style call, the
registry-side wrapper is thin: deliver one message, then read the settled reply.

```typescript
import { dispatch, init } from '@flue/runtime';
import { SupportAssistant } from './agents/support-assistant.ts';

// Fire-and-forget: resolves at admission, before model processing.
const receipt = await dispatch(SupportAssistant, {
  id: 'ticket-42',
  message: { kind: 'user', body: 'Summarize.' },
});

// To block for the settled reply, use the instance handle.
const handle = init(SupportAssistant, { id: 'ticket-42' });
const reply = await handle.read(receipt);
```

For remote tool-style invocation, register `dispatch(...)` in the tool
registry under a stable id (dsh-righthand uses the `flue-agent` kind and
surfaces it as `cf_invoke`). Keep the wrapper thin: `dispatch()` returns at
admission (see Durable agent execution), so callers that need the result use
`init(...).read(receipt)` rather than assuming synchronous completion.

## Durability

Flue uses Durable Streams: an append-only event log makes state never volatile —
a process that dies is picked up and continued from the exact step it left off.
On Cloudflare this rides Agents SDK `runFiber()`, `stash()`, and
`onFiberRecovered()`.

## Code execution and the workspace

- Flue uses `@cloudflare/codemode` (Dynamic Workers) to power its code tool:
  the agent writes JavaScript against the workspace and runs it in a fresh
  Worker isolate — faster/cheaper than booting a container per tool call.
- Flue uses `@cloudflare/shell` for a durable virtual filesystem inside the
  Durable Object, backed by SQLite (typed read/write/edit/search/grep/diff).
- Prefer `state.glob`/`state.readFile`/etc. for text workspace work instead
  of many individual tools.

## Anti-patterns / gotchas

- **Don't hand-author `FLUE_*` bindings** in `wrangler.jsonc`.
- **Don't use `db.ts`** on the Cloudflare target — it is rejected at build time.
- **Don't rewrite/reorder deployed migration entries** — append only.
- **Do declare `deleted_classes`** when removing a deployed agent class.
- **Only set `nodejs_compat`** when the agent actually uses Node.js APIs —
  adding it unnecessarily can conflict with other compatibility flags.
- **Don't add a Worker cron trigger for `scheduleEvery(...)`** — use the
  Durable Object's own scheduling.

## Scope

This skill covers Flue on Cloudflare. For Flue features that are target-agnostic
(models, tools, MCP, skills, subagents, channels, workflows, evals), see the
Flue docs; for the underlying platform primitives load the `agents-sdk` and
`durable-objects` skills.
