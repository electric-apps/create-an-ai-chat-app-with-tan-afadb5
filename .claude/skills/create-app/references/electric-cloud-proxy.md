# Electric Cloud proxy — TanStack Start wiring

**Read this when your app uses Yjs, Durable Streams, or StreamDB with Electric Cloud.**

For the proxy logic itself (block-list headers, `content-encoding` fix, `duplex: "half"`, common mistakes), read the authoritative intent skill shipped with the package:

```bash
cat node_modules/@durable-streams/y-durable-streams/skills/yjs-server/SKILL.md
```

This file only covers the **TanStack Start route wiring** — how to expose the proxy as a `createFileRoute` + `server.handlers` endpoint in this scaffold.

## TanStack Start route: `/api/yjs/$`

Use the `$` splat route to capture all Yjs sub-paths (`/docs/<id>`, `/docs/<id>/awareness`, etc.):

```typescript
// src/routes/api/yjs/$.ts
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/yjs/$")({
  server: {
    handlers: {
      GET: proxyYjs,
      POST: proxyYjs,
      PUT: proxyYjs,
      PATCH: proxyYjs,
      DELETE: proxyYjs,
      OPTIONS: proxyYjs,
    },
  },
})
```

The `proxyYjs` function reads `YJS_URL` and `YJS_SECRET` from `process.env`, injects the `Authorization: Bearer` header, and forwards using the block-list pattern from the `yjs-server` skill. Use `params._splat` for the sub-path and preserve the query string.

## Client-side: use `absoluteApiUrl`

The `baseUrl` passed to `YjsProvider` must be an absolute URL — relative paths crash inside `new URL(baseUrl)`. Use the scaffold's `absoluteApiUrl` helper:

```typescript
import { absoluteApiUrl } from "@/lib/client-url"

const provider = new YjsProvider({
  doc: ydoc,
  baseUrl: absoluteApiUrl("/api/yjs"),
  docId,
  awareness,
})
```

The route must have `ssr: false` — see `references/ssr-handling.md`.

## Durable Streams proxy (same pattern)

For `@durable-streams/client` or StreamDB, create `src/routes/api/streams.$streamId.ts` with the same structure. Read `ELECTRIC_DS_SERVICE_ID` and `ELECTRIC_DS_SECRET` from env and forward to `${ELECTRIC_URL}/v1/stream/...`.

## Env var naming

One env var per service, read only from server code:

| Service | Env vars |
|---|---|
| Electric shapes (auto-provisioned) | `ELECTRIC_URL`, `ELECTRIC_SOURCE_ID`, `ELECTRIC_SECRET` |
| Durable Streams (events / StreamDB) | `ELECTRIC_DS_SERVICE_ID`, `ELECTRIC_DS_SECRET` |
| Yjs | `ELECTRIC_YJS_SERVICE_ID`, `ELECTRIC_YJS_SECRET` |

### content-length MUST be dropped unconditionally on streaming proxies

When proxying streaming responses (SSE, chunked), ALWAYS delete `content-length` from forwarded headers — do NOT make the drop conditional on `transfer-encoding` also being present:

```typescript
// WRONG — conditional is a no-op when transfer-encoding was already stripped
if (headers.has("transfer-encoding") && headers.has("content-length")) {
  headers.delete("content-length")
}

// RIGHT — always drop content-length on streaming proxies
headers.delete("content-length")
headers.delete("content-encoding")
headers.delete("transfer-encoding")
```

## Anti-patterns

- ❌ Client code importing `process.env.ELECTRIC_SECRET` — leaks into the Vite bundle
- ❌ `YjsProvider({ baseUrl: "https://api.electric-sql.cloud/..." })` — 401 `MISSING_SECRET`
- ❌ Passing the secret in client-side `headers.Authorization` — leaks into the bundle
- ❌ Hardcoding secrets in committed files (`.env` must be gitignored)
