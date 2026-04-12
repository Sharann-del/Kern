# kern

**Your personal data OS. You define the structure. You write the interface. You own everything.**

---

Kern is a keyboard-driven, code-extensible personal data operating system. Define your own collections — books, tasks, workouts, expenses, anything. Connect live sources — GitHub, Notion, Linear, Google Calendar — and they flow in automatically. View your data through built-in views or custom React components you write yourself. Control everything from the keyboard. Connect Claude via MCP and manage your entire life in plain English.

No predefined structure. No vendor lock-in. No monthly subscription. Everything lives in your own Supabase instance.

---

## Platforms

| Platform | Status | Stack |
|----------|--------|-------|
| Web | ✅ Live | React + Vite + TypeScript + Tailwind |
| Desktop | 🚧 In progress | Tauri v2 (macOS, Windows, Linux) |
| iOS | 🚧 In progress | SwiftUI |
| Terminal | 🚧 In progress | Go + Bubble Tea |

---

## What it looks like

```
┌──────────────────────────────────────────────────────────────────────┐
│ kern                                    ● Books › 24 rows    q quit  │
├──────────────┬───────────────────────────────────┬───────────────────┤
│ Collections  │ Rows                              │ Preview           │
│              │                                   │                   │
│ ▶ Books      │ > The Pragmatic Programmer        │ Title             │
│   Tasks      │   Clean Code                      │ The Pragmatic...  │
│   Workouts   │   Designing Data-Intensive Apps   │                   │
│   Expenses   │   SICP                            │ Author            │
│   Goals      │   A Philosophy of Software Design │ Andy Hunt         │
│              │                                   │                   │
├──────────────┴───────────────────────────────────┴───────────────────┤
│ [n]ew  [d]elete  [e]edit  [/]search  [f]fields  [tab]focus  [q]quit  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Features

**Collections engine**
- Define any data structure with 13 field types: text, number, date, select, relation, file, and more
- Multiple views per collection: Table, Kanban, Calendar, Gallery, List
- Filters, sorts, and field visibility saved per view
- Relations between any two collections with reverse lookups

**Live sources**
- GitHub — pull requests, issues, repositories
- Google Calendar — events
- Notion — databases
- Linear — issues and projects
- RSS feeds
- Everything syncs automatically and appears as a normal collection

**Views as code**
- Write custom React components as views on any collection
- Monaco editor built in with full TypeScript IntelliSense
- Sandboxed iframe execution
- Export and import views as `.kern-view.json` files

**Claude MCP integration**
- MCP server running as a Supabase Edge Function
- Connect Claude to your workspace in one step
- Claude can create, read, update, and delete any data via natural language

**Command palette**
- `Cmd+K` for everything
- Schema-aware — knows your collection names, field names, view names
- Navigate, create, filter, sort without touching the mouse

---

## Tech stack

```
Frontend    React 18 · Vite · TypeScript · Tailwind CSS · Framer Motion
UI          Radix UI · cmdk · TanStack Query · TanStack Table · dnd-kit
Backend     Supabase (Postgres · Auth · Realtime · Edge Functions · Storage)
Desktop     Tauri v2
iOS         SwiftUI
Terminal    Go · Bubble Tea · Lipgloss
Monorepo    pnpm workspaces
```

---

## Project structure

```
kern-monorepo/
├── apps/
│   ├── web/          ← Vite + React web app
│   ├── desktop/      ← Tauri desktop wrapper
│   ├── ios/          ← SwiftUI iOS app
│   └── tui/          ← Go terminal UI
├── packages/
│   ├── types/        ← Shared TypeScript types
│   └── supabase-client/ ← Shared Supabase client
└── pnpm-workspace.yaml
```

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase CLI
- Go 1.22+ (for TUI)
- Rust + Xcode CLT (for desktop)

### Local development

```bash
git clone https://github.com/yourusername/kern
cd kern
pnpm install

cd apps/web
supabase start
supabase db push
supabase gen types typescript --local > src/types/database.ts

cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

pnpm dev
```

### Desktop

```bash
pnpm desktop
```

### Terminal

```bash
pnpm tui:run

# Standalone binary
pnpm tui:build
# → ./bin/kern
```

---

## Environment variables

```env
# apps/web/.env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
```

Edge Function secrets (via `supabase secrets set`):

```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
LINEAR_CLIENT_ID
LINEAR_CLIENT_SECRET
ENCRYPTION_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Connecting Claude

1. Deploy the `kern-mcp` Edge Function
2. Go to Settings → Integrations in the Kern web app
3. Copy your MCP server URL and auth token
4. In Claude.ai → Settings → Integrations → Add MCP server
5. Paste the URL and token
6. Ask Claude: *"What collections do I have in Kern?"*

---

## Database

All data lives in your Supabase Postgres instance:

```
profiles              → user accounts
collections           → your defined collections
fields                → schema per collection
rows                  → all data (JSONB)
row_relations         → links between rows
views                 → saved view configs
dashboard_widgets     → dashboard layout
custom_views_registry → your custom React views
```

Row Level Security is enabled on every table. Data is scoped to your user ID at the database level.

---

## Deployment

### Web

```bash
# Set root directory to apps/web in Vercel dashboard
vercel --prod
```

### Edge Functions

```bash
supabase functions deploy kern-mcp
supabase functions deploy sync-github
supabase functions deploy sync-google-calendar
supabase functions deploy sync-notion
supabase functions deploy sync-linear
supabase functions deploy sync-rss
```

### Desktop

Tauri builds `.dmg`, `.exe`, and `.AppImage` automatically via GitHub Actions on release tags:

```bash
git tag v1.0.0
git push --tags
```

---

## Custom views

Write a React component, get a custom view on any collection:

```tsx
export default function HabitHeatmap({ rows, fields }) {
  const dateField = fields.find(f => f.type === 'date')
  const weeks = 26
  const today = new Date()

  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (weeks * 7 - 1 - i))
    return d
  })

  const dateSet = new Set(
    rows.map(r => r.data[dateField?.slug ?? '']).filter(Boolean)
  )

  return (
    <div className="p-6">
      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const day = days[w * 7 + d]
              const active = dateSet.has(day.toISOString().split('T')[0])
              return (
                <div
                  key={d}
                  className={`w-3 h-3 rounded-sm ${
                    active ? 'bg-[#C8A84B]' : 'bg-[#2C2C2A]'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Open the custom view editor → paste → `Cmd+S` → renders live against your real data.

---

## MCP tools

| Tool | Description |
|------|-------------|
| `list_collections` | List all collections with their fields |
| `query_rows` | Query rows with filters and sorting |
| `get_row` | Get a single row by ID |
| `create_row` | Create a new row |
| `update_row` | Update row fields |
| `delete_row` | Delete a row |
| `create_collection` | Create a new collection with fields |
| `add_field` | Add a field to a collection |
| `search_rows` | Full-text search across collections |

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+\` | Toggle sidebar |
| `Escape` | Close panels / modals |
| `Enter` | Expand row |
| `Tab` | Next field in row editor |
| `Cmd+Enter` | Save row |

---

## Philosophy

Every other productivity tool gives you their interface. You pour your life into their mold. Kern has no mold.

- No predefined modules — you define what to track
- Data is data regardless of source — a manual collection and a GitHub sync look identical
- Keyboard first — every action is a command
- Write code to unlock power — custom views are React components
- Own your data — everything is in your Postgres, queryable directly

---

## What Kern is not

- Not a collaboration tool — single user, personal workspace
- Not a SaaS — runs on your own Supabase, costs $0
- Not an AI product — Claude integration is optional via MCP
- Not mobile-first — desktop and keyboard driven

---

## Roadmap

- [ ] Timeline / Gantt view
- [ ] Bulk CSV import with column mapping
- [ ] Formula and rollup fields
- [ ] `kern today` terminal command
- [ ] Shell hook for zsh / bash
- [ ] iOS Live Activities + Dynamic Island
- [ ] iOS Quick Capture widget
- [ ] Spotlight search integration
- [ ] Offline mode

---

*Built by Sharann · React · Vite · TypeScript · Supabase · Tauri · SwiftUI · Go*
