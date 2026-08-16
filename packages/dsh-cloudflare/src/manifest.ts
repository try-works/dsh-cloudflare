/**
 * Auto-generated from the vendored Codex Cloudflare skill frontmatter.
 * Do not edit by hand; regenerate with: node scripts/gen-manifest.mjs
 */

export interface VendoredSkill {
  /** Kebab-case skill name (matches the skill directory). */
  readonly name: string
  /** Model-facing description from the SKILL.md frontmatter. */
  readonly description: string
  /** Whether the skill bundle ships a references/ or assets/ directory. */
  readonly hasResources: boolean
}

/** The complete vendored Codex Cloudflare skill surface, in stable order. */
export const VENDORED_SKILLS: readonly VendoredSkill[] = [
  { name: "agents-sdk", description: "Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating stateful agents, durable workflows, real-time WebSocket apps, scheduled tasks, MCP servers, or chat applications. Covers Agent class, state management, callable RPC, Workflows integration, and React hooks. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "building-ai-agent-on-cloudflare", description: "Builds AI agents on Cloudflare using the Agents SDK with state management,\nreal-time WebSockets, scheduled tasks, tool integration, and chat capabilities.\nGenerates production-ready agent code deployed to Workers.\nUse when: user wants to \"build an agent\", \"AI agent\", \"chat agent\", \"stateful\nagent\", mentions \"Agents SDK\", needs \"real-time AI\", \"WebSocket AI\", or asks\nabout agent \"state management\", \"scheduled tasks\", or \"tool calling\".\nBiases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "building-mcp-server-on-cloudflare", description: "Builds remote MCP (Model Context Protocol) servers on Cloudflare Workers\nwith tools, OAuth authentication, and production deployment. Generates\nserver code, configures auth providers, and deploys to Workers.\nUse when: user wants to \"build MCP server\", \"create MCP tools\", \"remote\nMCP\", \"deploy MCP\", add \"OAuth to MCP\", or mentions Model Context Protocol\non Cloudflare. Also triggers on \"MCP authentication\" or \"MCP deployment\".\nBiases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "cloudflare", description: "Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI (Workers AI, Vectorize, Agents SDK), networking (Tunnel, Spectrum), security (WAF, DDoS), and infrastructure-as-code (Terraform, Pulumi). Use for any Cloudflare development task. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "durable-objects", description: "Create and review Cloudflare Durable Objects. Use when building stateful coordination (chat rooms, multiplayer games, booking systems), implementing RPC methods, SQLite storage, alarms, WebSockets, or reviewing DO code for best practices. Covers Workers integration, wrangler config, and testing with Vitest. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "flue", description: "Build and deploy Flue agents on Cloudflare — the open TypeScript agent framework (from the Astro team) built on the Pi harness and the Cloudflare Agents SDK. Load when creating Flue agents with 'use agent', deploying Flue to Cloudflare (Flue Durable Objects, wrangler migrations), wiring Workers AI/AI Gateway, Cloudflare Sandbox or Cloudflare Computer, or using the Flue CLI (@flue/cli, flue add, flue run). Biases towards retrieval from Cloudflare and Flue docs over pre-trained knowledge.", hasResources: false },
  { name: "sandbox-sdk", description: "Build sandboxed applications for secure code execution. Load when building AI code execution, code interpreters, CI/CD systems, interactive dev environments, or executing untrusted code. Covers Sandbox SDK lifecycle, commands, files, code interpreter, and preview URLs. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "think", description: "Build durable chat agents on Cloudflare Workers with @cloudflare/think — an opinionated chat-agent base class on the Agents SDK. Load when creating chat agents with persistent memory, resumable streaming, workspace file tools, client tools, messengers, human-in-the-loop turns, or durable submissions. Covers the Think class, getModel, configureSession, getTools, lifecycle hooks, channels, sub-agents via chat(), programmatic submissions, and ThinkWorkflow. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: false },
  { name: "web-perf", description: "Analyzes web performance using Chrome DevTools MCP. Measures Core Web Vitals (FCP, LCP, TBT, CLS, Speed Index), identifies render-blocking resources, network dependency chains, layout shifts, caching issues, and accessibility gaps. Use when asked to audit, profile, debug, or optimize page load performance, Lighthouse scores, or site speed. Biases towards retrieval from current documentation over pre-trained knowledge.", hasResources: true },
  { name: "workers-best-practices", description: "Reviews and authors Cloudflare Workers code against production best practices. Load when writing new Workers, reviewing Worker code, configuring wrangler.jsonc, or checking for common Workers anti-patterns (streaming, floating promises, global state, secrets, bindings, observability). Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
  { name: "wrangler", description: "Cloudflare Workers CLI for deploying, developing, and managing Workers, KV, R2, D1, Vectorize, Hyperdrive, Workers AI, Containers, Queues, Workflows, Pipelines, and Secrets Store. Load before running wrangler commands to ensure correct syntax and best practices. Biases towards retrieval from Cloudflare docs over pre-trained knowledge.", hasResources: true },
]

/** Map of skill name to its index in {@link VENDORED_SKILLS}. */
export const VENDORED_SKILL_INDEX: Readonly<Record<string, number>> = {
  "agents-sdk": 0,
  "building-ai-agent-on-cloudflare": 1,
  "building-mcp-server-on-cloudflare": 2,
  "cloudflare": 3,
  "durable-objects": 4,
  "flue": 5,
  "sandbox-sdk": 6,
  "think": 7,
  "web-perf": 8,
  "workers-best-practices": 9,
  "wrangler": 10,
}
