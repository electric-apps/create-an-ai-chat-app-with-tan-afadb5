# Claude Chat

A persistent AI chat application powered by Claude models via the Anthropic API. Built with TanStack Start, Electric SQL, and Durable Streams.

Conversations are durable — messages persist across page refreshes and resume mid-generation if the page is reloaded during streaming. Multiple conversations are supported with a sidebar for switching between them.

## Features

- **Persistent chat**: Messages survive page refreshes via Durable Streams
- **Resumable generation**: Reload mid-stream and pick up where Claude left off
- **Multiple conversations**: Create, switch, rename, and delete conversations
- **Model selection**: Choose between Claude Opus 4.6, Sonnet 4.6, and Haiku 4.5
- **Client-side API key**: Your Anthropic API key stays in localStorage, never stored server-side
- **Live sidebar**: Conversation list syncs in real-time via Electric SQL
- **Auto-generated titles**: Conversation titles are generated from the first message
- **Responsive design**: Mobile-friendly with collapsible sidebar

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Install

```bash
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```bash
# Postgres database (required)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Electric SQL sync (required)
ELECTRIC_URL=https://api.electric-sql.cloud
ELECTRIC_SOURCE_ID=your-source-id
ELECTRIC_SECRET=your-secret

# Durable Streams (required for chat persistence)
DS_SERVICE_ID=your-ds-service-id
DS_SECRET=your-ds-secret
DS_URL=https://api.electric-sql.cloud
```

### Run Migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Start Dev Server

```bash
pnpm dev:start
```

The app is available at `https://localhost:5978` (HTTPS with HTTP/2 via Caddy).

If the HTTPS certificate isn't trusted, run `pnpm trust-cert` from the Electric Studio repo root, restart your browser, and reopen the preview link.

## Architecture

- **Framework**: TanStack Start (React, file-based routing)
- **Database**: Postgres via Drizzle ORM
- **Real-time sync**: Electric SQL shapes for the conversation list
- **Chat persistence**: Durable Streams with TanStack AI transport
- **AI**: Anthropic Claude via `@tanstack/ai-anthropic`
- **UI**: shadcn/ui + Tailwind CSS with Electric design system
- **Styling**: Dark-first theme with purple accents

## How It Works

1. **Conversations** are stored in Postgres and synced to the client via Electric SQL shapes + TanStack DB collections
2. **Chat messages** are written to Durable Streams (append-only), making them persistent and resumable
3. **API keys** are stored in the browser's localStorage and sent as headers on each request
4. The server-side chat handler uses `@tanstack/ai` with the Anthropic adapter to call Claude
5. Titles are auto-generated using Claude Haiku after the first assistant response
