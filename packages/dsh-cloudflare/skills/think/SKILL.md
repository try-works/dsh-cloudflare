---
name: think
description: Build durable chat agents on Cloudflare Workers with @cloudflare/think — an opinionated chat-agent base class on the Agents SDK. Load when creating chat agents with persistent memory, resumable streaming, workspace file tools, client tools, messengers, human-in-the-loop turns, or durable submissions. Covers the Think class, getModel, configureSession, getTools, lifecycle hooks, channels, sub-agents via chat(), programmatic submissions, and ThinkWorkflow. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.
---

# Cloudflare Think

Build chat agents whose work outlives the request: durable turns, recovery-aware
delivery, tree-structured sessions, client tools, and messengers — all backed by
Durable Object SQLite.

**For the underlying primitives load the `agents-sdk` and `durable-objects` skills first.**

Your knowledge of Think may be outdated. **Prefer retrieval over pre-training**
for any Think task — the API surface is stable but experimental and evolves.

## Retrieval Sources

Fetch the **latest** docs before implementing; do not rely on baked-in API
signatures or configuration shapes.

| Source | URL |
|--------|-----|
| Think docs (canonical) | `https://github.com/cloudflare/agents/tree/main/docs/think` |
| Package | `https://www.npmjs.com/package/@cloudflare/think` |
| Agents SDK docs | `https://developers.cloudflare.com/agents/` |
| Sessions (context blocks, compaction, search) | `https://github.com/cloudflare/agents/blob/main/docs/agents/sessions.md` |
| Human in the loop | `https://github.com/cloudflare/agents/blob/main/docs/agents/human-in-the-loop.md` |
| **Verified** | 2026-07 against @cloudflare/think 0.15.1 (docs/think at `cloudflare/agents` main) |

## Quick Start

### Install

```sh
npm install @cloudflare/think agents ai @cloudflare/shell zod
```

`workers-ai-provider` is bundled with Think, so the common case needs no extra
provider package — `getModel()` can return a model id string.

### wrangler.jsonc

```jsonc
{
  "name": "my-think-agent",
  "compatibility_date": "<today>",
  "compatibility_flags": ["nodejs_compat"],
  "ai": { "binding": "AI" },
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/agents/*"]
  },
  "durable_objects": {
    "bindings": [{ "class_name": "MyAgent", "name": "MyAgent" }]
  },
  "migrations": [{ "new_sqlite_classes": ["MyAgent"], "tag": "v1" }],
  "main": "src/server.ts"
}
```

> **The `ai` binding is conditional.** It is only required to resolve
> *string* model ids from `getModel()` — a `@cf/...` id via Workers AI, or
> a `provider/model` slug via AI Gateway (both resolve through the bundled
> `workers-ai-provider` off `getAIBinding()`, default `this.env.AI`).
> When `getModel()` returns a `LanguageModel` object (external provider),
> the binding is unnecessary — omit it.

`vite.config.ts`: `import { cloudflare } from "@cloudflare/vite-plugin"` —
add `cloudflare()` to the plugins (with `react()`/`tailwindcss()` as needed).
`tsconfig.json`: `{ "extends": "agents/tsconfig" }`.

### Server (src/server.ts)

```typescript
import { Think } from "@cloudflare/think";
import { routeAgentRequest } from "agents";

export class MyAgent extends Think<Env> {
  getModel() {
    // "@cf/..." id for Workers AI, or "provider/model" to route via AI Gateway.
    return "@cf/moonshotai/kimi-k2.7-code";
  }
  getSystemPrompt() {
    return "You are a helpful assistant with a workspace filesystem.";
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
```

> **Routing helper.** Prefer `routeAgentRequest(request, env)` — the current
> documented entry point for both HTTP requests and WebSocket upgrades (see the
> `agents-sdk` skill's routing reference). Its optional third argument is a
> routing-options object (e.g. `{ cors: true }`), not an agent name. For
> server-side RPC without HTTP, use `getAgentByName(env.MyAgent, name)`
> instead.

That is a working agent: WebSocket chat protocol, SQLite message persistence,
resumable streaming, workspace file tools, abort/cancel, and error handling with
partial message persistence.

### Client (React)

```tsx
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/think/react";

function Chat() {
  const agent = useAgent({ agent: "MyAgent" });
  const { messages, sendMessage, status } = useAgentChat({ agent });
  // ... render messages; sendMessage({ text }) streams back
}
```

> **`setMessages` is display-only on Think.** The transcript is a projection
> of the server-authoritative Session tree. Edits update the screen but are not
> persisted and won't survive refresh/reconnect; call `clearHistory()` to
> clear.

## Tool Merge Order

On every turn, Think merges tools; later sources override earlier name
collisions:

1. **Workspace tools** — `read`, `write`, `edit`, `list`, `find`, `grep`, `delete`, `bash` (built-in)
2. **`getTools()`** — custom server-side tools
3. **Extension tools** — from loaded extensions (prefixed by extension name)
4. **Session tools** — `set_context`, `load_context`, `search_context` (from `configureSession`)
5. **Skill tools** — `activate_skill`, `read_skill_resource`, optional `run_skill_script`
6. **MCP tools** — from connected MCP servers (when enabled)
7. **Client tools** — from the browser

## Persistent memory

```typescript
configureSession(session: Session) {
  return session
    .withContext("soul", {
      provider: { get: async () => "You are a helpful assistant." }
    })
    .withContext("memory", {
      description: "Important facts about the user and conversation.",
      maxTokens: 2000
    })
    .withCachedPrompt();
}
```

The model gets a `MEMORY` section and a `set_context` tool; facts persist in
SQLite across DO hibernation and restarts.

## Lifecycle hooks

Hooks fire on every turn regardless of entry path (WebSocket, `chat()`,
`saveMessages()`, `submitMessages()`, `continueLastTurn()`):
`configureSession`, `beforeTurn`, `beforeStep`, `beforeToolCall`,
`afterToolCall`, `onStepFinish`, `onChunk`, `onChatResponse`,
`onChatError`. Use them to switch models per-turn, restrict tools, log, or
gate tool calls.

## Channels and messengers

Every Think agent has an implicit `web` channel (browser WebSocket). Add
channels — or override the `web` policy — with `configureChannels()`
(`ChannelDefinition`: `kind` web|messenger|voice|custom, `ingress`,
`instructions`, `tools` filter, `maxTurns`, `capabilities`). Messengers
from `getMessengers()` are absorbed as `messenger` channels; wrap a Chat SDK
adapter with `messengerChannel()`.

```typescript
import { Think, messengerChannel } from "@cloudflare/think";
import telegramMessenger from "@cloudflare/think/messengers/telegram";

getMessengers() {
  return {
    telegram: telegramMessenger({
      token: this.env.TELEGRAM_BOT_TOKEN,
      userName: "support_bot",
      secretToken: this.env.TELEGRAM_WEBHOOK_SECRET_TOKEN
    })
  };
}
// webhook: https://<worker>/messengers/telegram/webhook
```

## Sub-agents and programmatic turns

- **Sub-agent**: `chat(userMessage, callback, options)` runs a full turn and
  streams events via `StreamCallback` (`onStart`, `onEvent`, `onDone`,
  `onError`). Client tools over RPC: pass `clientTools` + `onClientToolCall`
  in `ChatOptions`.
- **Durable submissions**: `submitMessages(messages, { idempotencyKey })`
  durably accepts a turn and returns a `submission` record before inference
  runs; the caller returns `submission.submissionId` immediately. Statuses:
  `pending`, `running`, `completed`, `aborted`, `skipped`, `error`.
  Inspect with `inspectSubmission`/`listSubmissions`, cancel with
  `cancelSubmission`, prune with `deleteSubmissions`. Retrying with the same
  `idempotencyKey` returns the existing record (`accepted: false`) instead of
  duplicating messages.
- **Scheduled tasks**: recurring code-declared prompts via `getScheduledTasks()`
  use the same durable submission path.

## ThinkWorkflow

`ThinkWorkflow` (from `@cloudflare/think/workflows`) connects a Think turn to
Cloudflare Workflows for durable multi-step jobs with approval gates or long
waits. Inside `run()`, call `step.prompt("id", { prompt, output: schema,
timeout })` for a typed model step and `step.do(...)` for side effects; start
from the agent with `runWorkflow("WORKFLOW", params, options)`. Use for jobs
where steps matter; keep recurring prompts as scheduled tasks and one-off
background turns on `submitMessages()`.

## Think actions as tools

Actions are server-side tools with batteries included. Where a plain AI SDK
`tool()` is just a description, a schema, and an `execute` function, an
`action()` adds what is tedious and dangerous to hand-roll for a tool with
real side effects:

- **Idempotency** — a durable ledger replays a settled result by a stable key
  instead of re-running the side effect on a recovery retry.
- **Approvals** — gate a call behind a human, inline (the turn waits) or
  durably (the turn parks and resumes later, even with no live socket).
- **Authorization** — declare the permissions a call requires and grant them
  per-turn.
- **Reply attachments** — record advisory delivery metadata (a drafted email, a
  card, a voice note) without changing what the model sees.

Actions compile into Think tools, so the model calls them exactly like any other
tool. Return them from `getActions()`; Think merges them into the tool set
alongside `getTools()`, workspace tools, extensions, and MCP tools.

```typescript
import { Think, action } from "@cloudflare/think";
import { z } from "zod";

export class Support extends Think<Env> {
  getActions() {
    return {
      refundOrder: action({
        description: "Refund a customer order.",
        inputSchema: z.object({
          orderId: z.string(),
          amountCents: z.number().int().positive()
        }),
        execute: async ({ orderId, amountCents }, ctx) => {
          const result = await refund(orderId, amountCents);
          return { refundId: result.id, status: result.status };
        }
      })
    };
  }
}
```

The map key is the tool name the model sees (unless you set `name`); the
`execute` input type is inferred from `inputSchema`. Each action has a
default timeout of 30 seconds; override with `timeoutMs`. Anything thrown
from `execute` becomes a structured `{ error: { name, message } }` tool
result rather than crashing the turn.

**Idempotency keys** — declare a stable domain identifier, never a timestamp,
request id, or random value:

```typescript
chargeInvoice: action({
  description: "Charge an invoice.",
  inputSchema: z.object({ invoiceId: z.string() }),
  idempotencyKey: ({ input }) => `invoice:${input.invoiceId}`,
  execute: async ({ invoiceId }) => charge(invoiceId)
});
```

`idempotencyKey` is a string or a function `({ input, ctx }) => string`; the
settled result is recorded in a durable ledger keyed by
`action:<name>:<key>` and replayed on a retry without re-running
`execute`. An action with no key falls back to a per-`toolCallId` key.

**Approvals** — set `approval: true` (or a function) and optionally
`approvalSummary` / `approvalRisk`; the turn parks and can be approved or
rejected via `pendingApprovals()` / `approveExecution(executionId)` /
`rejectExecution(executionId, reason?)`. `kind` is inferred
(`approval-gated` when `approval` is set, else `server`); set
`"durable-pause"` explicitly for a parked turn.

**Authorization** — declare `permissions` on the action and override
`authorizeTurn(ctx)` (full grant, deny, or a narrowed
`{ allowed, grantedPermissions }` set) or `authorizeAction(ctx)` for
per-call logic. An action requiring a permission outside the grant is denied
with a structured `ActionAuthorizationError` — the model never calls
`execute`.

**Code execution** — the `execute` tool (`createExecuteTool(this)` from
`@cloudflare/think/tools/execute`, with a `worker_loaders` binding) lets the
model write and run TypeScript in a sandboxed Worker on a durable codemode
runtime — durable pauses, audit trail, and reusable snippets. Approvals inside
the sandbox pause durably and resolve via the same `approveExecution` /
`rejectExecution` callables; render approval cards from
`pendingExecutions()`, never from the truncated paused tool output.

> **An action is a reusable tool, not necessarily a chat agent.** dsh-righthand
> drives Think this way via a `think-action` kind: the action's RPC is wrapped
> as a standalone registry tool, so side-effectful Think actions are invocable
> without a chat surface. See `docs/think/actions.md` for the full reference.

## Anti-patterns / gotchas

- **Don't treat `setMessages` as persistence** — Think is server-authoritative.
- **Don't hand-roll the agentic loop** — Think owns `streamText`; use hooks.
- **Don't persist client-tool schemas/executors** — they are per-turn only;
  after eviction, recovery errors the orphaned call and the model proceeds.
- **Do use `submitMessages()` for webhooks/RPC** with strict timeouts — never
  guess between queued/running/completed after a timeout.
- **Do use `new_sqlite_classes`** migrations (Think agents are SQLite-backed DOs).
- **Do fetch current docs before citing APIs** — Think is experimental.

## Scope

This skill covers Think specifically. For the underlying primitives
(Durable Objects, routing, sessions, scheduling, MCP), load the `agents-sdk`
skill and the `durable-objects` skill; for the Agents SDK's code-execution
sandbox see `@cloudflare/codemode` docs and the `sandbox-sdk` skill.
