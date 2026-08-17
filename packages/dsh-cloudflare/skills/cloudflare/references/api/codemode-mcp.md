# Cloudflare Code Mode MCP

The plugin always mounts Cloudflare's **Code Mode** MCP server at
`https://mcp.cloudflare.com/mcp` (DSH server name `cloudflare-api`). It
exposes the **entire Cloudflare API** — over 2,500 endpoints across DNS,
Workers, R2, Zero Trust, and every other product — through three tools that
cost ~1,000 tokens instead of the ~1M tokens a per-endpoint tool list would.

The code you write runs server-side in an isolated Dynamic Worker sandbox; the
API token never enters your code.

## Tool mapping

| Code Mode tool | DSH public name | Purpose |
| --- | --- | --- |
| `search` | `mcp__cloudflare-api__search` | Run JS against the OpenAPI spec to find endpoints |
| `execute` | `mcp__cloudflare-api__execute` | Call the Cloudflare API with `cloudflare.request()` |
| `docs` | `mcp__cloudflare-api__docs` | Search live Cloudflare documentation |

## Workflow

1. **search** — find the right method, path, and required parameters.
2. **execute** — run the API call and read the typed `result`.
3. **docs** — resolve product, limits, or config questions.

Repeat search → execute as needed. Prefer this MCP over wrangler/curl/SDKs
whenever the task is account inspection or mutation; fall back to wrangler
for explicitly local workflows (`wrangler dev`, `wrangler types`), and to
the SDKs when writing application code the user will run themselves.

## search — find the endpoint

`search` runs a read-only JavaScript async arrow function against a
pre-resolved OpenAPI spec. The sandbox provides `spec` (all `$ref`s already
inlined):

```js
// Find endpoints for a product
async () => {
  const results = [];
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (op.tags?.some((t) => t.toLowerCase() === 'workers')) {
        results.push({ method: method.toUpperCase(), path, summary: op.summary });
      }
    }
  }
  return results;
}
```

```js
// Inspect one operation's parameters and request body
async () => {
  const op = spec.paths['/accounts/{account_id}/workers/scripts']?.get;
  return { summary: op?.summary, parameters: op?.parameters, requestBody: op?.requestBody };
}
```

`spec.paths` values are `PathItem` objects with `get`/`post`/`put`/`patch`/`delete`
keys. Each operation has `summary`, `description`, `tags`, `parameters`,
`requestBody`, and `responses`.

## execute — call the API

`execute` runs an async arrow function against `cloudflare.request()`. The
sandbox provides `cloudflare` and (when a single account is resolved)
`accountId`. Use the `account_id` parameter to scope multi-account tokens.

```js
// List Workers scripts
async () => {
  const response = await cloudflare.request({
    method: 'GET',
    path: `/accounts/${accountId}/workers/scripts`,
  });
  return response.result;
}
```

```js
// Create a DNS record
async () => {
  const response = await cloudflare.request({
    method: 'POST',
    path: `/zones/${zoneId}/dns_records`,
    body: { type: 'A', name: 'api.example.com', content: '192.0.2.1', proxied: true },
  });
  return response.result;
}
```

```js
// GraphQL analytics
async () => {
  const response = await cloudflare.request({
    method: 'POST',
    path: '/client/v4/graphql',
    body: { query: `query { viewer { zones(filter: { zoneTag: "${zoneId}" }) { httpRequests1hGroups { dimensions { datetime } sum { requests } } } } }` },
  });
  return response.result;
}
```

### `cloudflare.request()` shape

```ts
interface CloudflareRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  contentType?: string // custom Content-Type (defaults to application/json when body is set)
  rawBody?: boolean    // send body verbatim without JSON.stringify
}

interface CloudflareResponse<T = unknown> {
  success: boolean
  status: number
  result: T
  errors: Array<{ code: number; message: string }>
  messages: Array<{ code: number; message: string }>
  result_info?: { page: number; per_page: number; total_pages: number; count: number; total_count: number }
}

declare const cloudflare: {
  request<T = unknown>(options: CloudflareRequestOptions): Promise<CloudflareResponse<T>>
}
declare const accountId: string
```

### Pagination

```js
// List every page
async () => {
  const all = [];
  let page = 1;
  while (true) {
    const res = await cloudflare.request({
      method: 'GET',
      path: `/accounts/${accountId}/workers/scripts`,
      query: { page, per_page: 50 },
    });
    all.push(...res.result);
    if (!res.result_info || page >= res.result_info.total_pages) break;
    page += 1;
  }
  return all;
}
```

## docs — search Cloudflare docs

```js
// (tool takes a plain query string, not code)
mcp__cloudflare-api__docs({ query: 'D1 pricing limits' })
```

Use it for limits, pricing, compatibility dates/flags, and product reference
questions instead of relying on pre-trained knowledge.

## Auth

On first connection the server redirects the user through Cloudflare OAuth to
grant scoped permissions. For CI/CD or automation, a Cloudflare API token can
be supplied as a bearer token (user or account token). An account-scoped token
pins `accountId` and removes the `account_id` parameter from `execute`.

## References

- [Code Mode MCP blog post](https://blog.cloudflare.com/code-mode-mcp/)
- [Cloudflare MCP repository](https://github.com/cloudflare/mcp)
- [Cloudflare API MCP server docs](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)
