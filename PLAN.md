# PLAN.md — AI Chat App with TanStack AI + Durable Streams

## App Description

A single-page AI chat application powered by Claude models via the Anthropic API. Users can create and switch between multiple persistent conversations, set their Anthropic API key from the UI, and chat with Claude. Each conversation is durable — messages persist across page refreshes and resume mid-generation if the page is reloaded during streaming.

---

## User Flows

### 1. First-time setup
1. User opens the app for the first time.
2. A settings panel or modal prompts them to enter their Anthropic API key.
3. User pastes their API key and clicks Save.
4. The key is stored in `localStorage` (client-only, never sent to server except as a request header at inference time).
5. User is taken to (or the UI unlocks) the main chat interface.

### 2. Starting a new conversation
1. User clicks "New Chat" in the sidebar.
2. A new conversation row is created in Postgres (title: "New Conversation", timestamped).
3. The conversation is immediately selected and the chat panel shows an empty thread.

### 3. Chatting
1. User types a message in the input box and presses Enter or clicks Send.
2. The message appears instantly (optimistic) in the message list.
3. The server posts the user message to the durable stream and calls the Anthropic API.
4. Claude's response streams back token-by-token into the chat thread.
5. If the user refreshes mid-stream, the client reconnects and picks up from the last delivered token.

### 4. Switching conversations
1. User clicks a conversation in the sidebar.
2. The full message history for that conversation materializes from the durable stream.
3. If a generation was in progress, it resumes or shows as complete.

### 5. Changing the API key
1. User opens Settings (gear icon in sidebar footer).
2. User updates the API key and saves.
3. Subsequent chat requests use the new key.

### 6. Selecting a Claude model
1. In the settings panel, a dropdown lists available Claude models:
   - `claude-opus-4-6`
   - `claude-sonnet-4-6`
   - `claude-haiku-4-5-20251001`
2. User selects a model; the selection is persisted to `localStorage`.
3. All new messages in any conversation use the selected model.

### 7. Deleting a conversation
1. User right-clicks or hovers a conversation in the sidebar to reveal a Delete button.
2. Confirmation prompt appears.
3. On confirm, the conversation row is deleted from Postgres (cascade removes related data).

---

## Data Model

```ts
// src/db/schema.ts

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id:         uuid("id").primaryKey().defaultRandom(),
  title:      text("title").notNull().default("New Conversation"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Notes:**
- Message content lives in the durable stream (append-only), NOT in Postgres — this is the canonical pattern for AI chat with `@durable-streams/tanstack-ai-transport`.
- `conversations` table is synced via Electric shapes to power the sidebar list with live updates.
- The `updated_at` column is bumped server-side on each new message so the sidebar can sort by most-recently-active.
- The API key is stored only in the browser (`localStorage`), never persisted to the database.

---

## Key Technical Decisions

| Problem | Product | Package |
|---|---|---|
| Persistent, resumable, multi-tab AI chat | Durable Transport for TanStack AI | `@durable-streams/tanstack-ai-transport` |
| Live-synced conversation list in sidebar | Electric shapes + TanStack DB | `@electric-sql/client` + `@tanstack/db` |
| Schema + migrations | Drizzle ORM | `drizzle-orm` + `drizzle-kit` |
| Full-stack framework + API routes | TanStack Start | `@tanstack/react-start` |
| UI components | shadcn/ui + Tailwind CSS | `@/components/ui/*` |

**Why Durable Transport over plain fetch/SSE:**
The app must persist chat history across page refreshes and survive mid-stream reloads. The durable transport writes each token into a Durable Stream; clients subscribe from their last known offset. This gives us persistence + resumability for free without any custom server-side storage of message content.

**Why Electric shapes for conversations (not Durable Streams):**
The conversation list is a mutable CRUD entity — users create, rename, and delete conversations. Electric shapes + TanStack DB handle this pattern (live-synced, optimistic mutations) better than an append-only stream.

**API key handling:**
The key is entered in the UI and stored in `localStorage`. On each chat request, the client sends it as a custom header (`X-Api-Key`). The server-side route reads it from the request header and uses it to construct the Anthropic API call. The key is never stored in Postgres or in the Durable Streams service.

---

## Infrastructure

### Phase 0: Infrastructure (coder responsibility)
- [ ] Provision Postgres + Electric source via Electric CLI (`services create postgres`)
  - Stores: `DATABASE_URL`, `ELECTRIC_SOURCE_ID`, `ELECTRIC_SECRET`
- [ ] Provision Durable Streams service via Electric CLI (`services create streams`)
  - Stores: `DS_SERVICE_ID`, `DS_SECRET`
- [ ] Write all credentials to `.env` via `set_secret`

---

## Required Skills

The coder must read these intent skills before writing any code:

### Always required
- `node_modules/@electric-sql/client/skills/electric-new-feature/SKILL.md`
- `node_modules/@tanstack/db/skills/db-core/SKILL.md`
- `node_modules/@tanstack/db/skills/db-core/live-queries/SKILL.md`
- `node_modules/@tanstack/db/skills/db-core/collection-setup/SKILL.md`

### For this app
- `node_modules/@durable-streams/tanstack-ai-transport/skills/tanstack-ai/SKILL.md` — durable AI chat transport (TanStack AI)

---

## Implementation Tasks

### Phase 1: Foundation
- [ ] Write Drizzle schema for `conversations` table (`src/db/schema.ts`)
- [ ] Generate and run the initial migration (`drizzle-kit generate` + `drizzle-kit migrate`)
- [ ] Set up Electric shape proxy route for the `conversations` shape (`src/routes/api/shape-proxy.ts`)
- [ ] Set up TanStack DB collection for conversations (`src/lib/collections.ts`)

### Phase 2: AI Chat Transport
- [ ] Create the server-side AI chat handler route using `@durable-streams/tanstack-ai-transport`
  - Route: `POST /api/chat` (or as a TanStack Start server handler)
  - Reads `X-Api-Key` header and `X-Model` header from the request
  - Calls Anthropic API (Claude models only) with the provided key and model
  - Writes the response into the durable stream via the transport
- [ ] Wire up the client-side `useChat()` hook from `@tanstack/ai-react` with the durable stream connection
  - Pass the `conversationId` so each conversation maps to its own stream
  - Pass the API key and selected model as custom headers

### Phase 3: Layout + Sidebar
- [ ] Create the root layout (`src/routes/__root.tsx`) with a two-column layout:
  - Left: `ConversationSidebar` component
  - Right: `ChatPanel` component (outlet)
- [ ] Build `ConversationSidebar`:
  - Displays list of conversations, sorted by `updated_at` desc, using a live query on the conversations collection
  - "New Chat" button at the top
  - Each item shows the conversation title, truncated
  - Active conversation is highlighted
  - Hover reveals a Delete (trash) icon button
  - Settings gear icon in the footer
- [ ] Implement "New Chat" action: creates a conversation row via a server function, navigates to the new conversation route
- [ ] Implement "Delete conversation" action: server function deletes the row, navigates home if active conversation was deleted

### Phase 4: Chat Route + Message Thread
- [ ] Create conversation route (`src/routes/chat.$conversationId.tsx`)
  - Mark `ssr: false` (uses live queries and durable stream subscription)
  - Loads conversation metadata from the TanStack DB collection
  - Renders `MessageThread` and `MessageInput` components
- [ ] Build `MessageThread`:
  - Displays messages from the durable stream in order (user + assistant turns)
  - Streams assistant tokens live as they arrive
  - Auto-scrolls to bottom on new content
  - Shows a typing indicator while generation is in progress
  - Handles empty state ("Start a conversation with Claude")
- [ ] Build `MessageInput`:
  - Textarea that grows with content (up to ~4 lines)
  - Send button (disabled while generating)
  - Enter to send, Shift+Enter for newline
  - Disabled with a tooltip if no API key is set

### Phase 5: Settings Panel
- [ ] Build `SettingsDialog` (shadcn Dialog):
  - API key input field (password type, with show/hide toggle)
  - Model selector dropdown (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001)
  - Save button persists both to `localStorage`
  - On open, pre-fills from `localStorage`
- [ ] Create a `useSettings` hook for reading/writing API key + selected model from `localStorage`
  - Exposes `apiKey`, `model`, `setApiKey`, `setModel`
  - Used by `MessageInput` (to pass headers) and `SettingsDialog`
- [ ] Show a dismissable banner at the top of the chat view if no API key is set, with a link to open Settings

### Phase 6: Conversation Title
- [ ] After the first assistant response in a new conversation, auto-generate a title:
  - Server-side: take the first user message, call a lightweight Claude completion (haiku) to produce a ≤6-word title
  - Update the `conversations` row `title` and `updated_at` via a server function
  - The sidebar updates live via Electric sync

### Phase 7: Polish + Home Route
- [ ] Create home route (`src/routes/index.tsx`): redirects to the most recent conversation, or shows an empty state with a "Start chatting" prompt if no conversations exist
- [ ] Add conversation rename: double-click the title in the sidebar to edit inline; save on blur/Enter via a server function
- [ ] Ensure `updated_at` is bumped on every new message so the sidebar stays sorted
- [ ] Add loading skeleton for the message thread while the durable stream initializes
- [ ] Responsive layout: on mobile, sidebar collapses to a hamburger menu

### Phase 8: README
- [ ] Write `README.md` documenting setup, environment variables, and how to run the app

---

## Parallel Work

### Sequential (must complete in order)
1. Phase 0 — Infrastructure provisioning
2. Phase 1 — Schema, migrations, Electric proxy, TanStack DB collection

### Parallel Group A (after Phase 1)
- Phase 2 — AI chat transport (server route + client hook)
- Phase 3 — Sidebar layout and conversation management

### Parallel Group B (after Group A)
- Phase 4 — Chat route + message thread
- Phase 5 — Settings panel + `useSettings` hook

### Sequential (after Group B)
- Phase 6 — Auto-generated conversation titles
- Phase 7 — Polish, home route, rename, responsive layout
- Phase 8 — README
