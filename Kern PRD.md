# KERN — Full Product Requirements & Specification Document
### Version 2.0 | Personal Data OS
### Built by Sharann | Stack: React + Vite + TypeScript + Tailwind CSS + Supabase

---

## TABLE OF CONTENTS

1. [Project Overview & Vision](#1-project-overview--vision)
2. [Core Philosophy](#2-core-philosophy)
3. [Target User](#3-target-user)
4. [Technical Stack — Full Specification](#4-technical-stack--full-specification)
5. [System Architecture](#5-system-architecture)
6. [Complete Database Schema](#6-complete-database-schema)
7. [TypeScript Type Definitions](#7-typescript-type-definitions)
8. [Core Concepts & Terminology](#8-core-concepts--terminology)
9. [Authentication System](#9-authentication-system)
10. [Collections Engine](#10-collections-engine)
11. [Fields Engine](#11-fields-engine)
12. [Rows Engine](#12-rows-engine)
13. [Views System](#13-views-system)
14. [Relations System](#14-relations-system)
15. [Dashboard System](#15-dashboard-system)
16. [Command Palette System](#16-command-palette-system)
17. [Live Sources System](#17-live-sources-system)
18. [Views as Code System](#18-views-as-code-system)
19. [MCP Server Specification](#19-mcp-server-specification)
20. [UI/UX Design Specification](#20-uiux-design-specification)
21. [Component Architecture](#21-component-architecture)
22. [State Management Architecture](#22-state-management-architecture)
23. [Data Fetching & Caching Strategy](#23-data-fetching--caching-strategy)
24. [Realtime Strategy](#24-realtime-strategy)
25. [File & Folder Structure](#25-file--folder-structure)
26. [Environment Variables & Configuration](#26-environment-variables--configuration)
27. [Supabase Project Configuration](#27-supabase-project-configuration)
28. [Non-Goals & Explicit Exclusions](#28-non-goals--explicit-exclusions)

---

## 1. Project Overview & Vision

### Name
**Kern**

### Tagline
*Your personal data OS. You define the structure. You write the interface. You own everything.*

### One-paragraph description
Kern is a keyboard-driven, code-extensible personal data operating system. You define Collections — structured tables for anything in your life. You connect Live Sources — GitHub, Notion, Linear, Google Calendar — and they flow in as Collections automatically. You view your data through built-in views or custom ones you write in React. You control everything from the keyboard via Cmd+K. And you can connect Claude to your Kern workspace via MCP, so Claude can read and write your data in plain English. Nothing is predefined. Nothing is locked. It costs nothing to run.

### What makes Kern different from every competitor

| Feature | Notion | Airtable | Linear | Obsidian | **Kern** |
|---------|--------|----------|--------|----------|----------|
| Custom views as React code | ❌ | ❌ | ❌ | ❌ | ✅ |
| Live sources as first-class collections | ❌ | ❌ | ❌ | ❌ | ✅ |
| Claude MCP integration | ❌ | ❌ | ❌ | ❌ | ✅ |
| Keyboard-first (Cmd+K for everything) | Partial | ❌ | ✅ | Partial | ✅ |
| Free to self-host forever | ❌ | ❌ | ❌ | ✅ | ✅ |
| No predefined structure | Partial | Partial | ❌ | ✅ | ✅ |
| Real Postgres behind everything | ❌ | ❌ | ❌ | ❌ | ✅ |

### Deployment
Local dev first. Vercel (hobby plan, free) after Phase 3. Backend stays on Supabase free tier forever.

### Cost to run
$0. Supabase free tier: 500MB storage, 2GB bandwidth, 50MB DB, unlimited API requests on free plan. Vercel hobby: free. Domain: already owned. Cursor Pro: already owned.

---

## 2. Core Philosophy

### 2.1 The interface is not given — it is built
Every other productivity tool gives you their interface. You pour your life into their mold. Notion gives you a blank page but forces its block model. Airtable gives you tables but locks the views. Linear gives you issues but forces its workflow. Kern has no mold. You define what to track, how to track it, what it looks like, and how it behaves. The app is a runtime for user-defined structure, not a collection of curated features.

### 2.2 Data is data, regardless of where it comes from
A Collection you created by hand and a Collection synced live from GitHub look identical at every layer of the system. Both are queryable with the same API. Both are relatable (a GitHub PR can be linked to a Goal). Both show up in your views and dashboard. Both are writable by Claude via MCP. The source is metadata — a flag and a config blob — not a constraint on what you can do with the data.

### 2.3 The keyboard is the primary input device
Cmd+K opens the command palette. Every meaningful action in the application is a command. The command palette is schema-aware — it knows your Collection names, your Field names, your View names, your current context. You should be able to navigate the entire app, create any data, change any setting, and execute any action without touching the mouse. The mouse works, but it is never required.

### 2.4 Power without complexity
The default state of Kern is a clean white surface with a sidebar listing your Collections. No onboarding wizard that locks you into a template. No tutorial popups. No feature announcements. The complexity is there when you reach for it: custom views require knowing React; relations require understanding data modeling; live sources require OAuth. But you should be able to use Kern as a simple personal database for months before discovering any of these features, and it should still be useful.

### 2.5 Write code to unlock unlimited power
Custom views are React functional components. The app ships with Monaco editor. If you know how to write a React component, you can build any interface imaginable on top of your Kern data. A GitHub contributions heatmap. A workout calendar. A reading progress tracker. A finance dashboard with recharts. The app provides a clean props interface: `{ rows, fields, onRowUpdate, onRowCreate, onRowDelete, onRowClick }`. You write the component. The app runs it in a sandboxed iframe. It lives permanently as a registered view on your Collection.

### 2.6 Own your data completely
Everything lives in your Supabase Postgres instance. There is no Kern cloud. There is no Kern account. You log in with your own Supabase project's auth. Your rows are JSONB in a Postgres table you can query directly with psql, TablePlus, or any Postgres client. If Kern (the app) disappears tomorrow, your data is still there. You can export it. You can migrate it. You can query it. No vendor lock-in.

---

## 3. Target User

### Primary User
Developers and CS students who want a personal productivity system that behaves like a developer tool. They are:
- Comfortable with React and TypeScript
- Familiar with APIs and data modeling
- Used to keyboard-driven tools (VS Code, Raycast, Linear, Warp)
- Frustrated that Notion is too slow and too document-oriented
- Frustrated that Airtable is too expensive for personal use
- Frustrated that everything requires monthly subscriptions

### Secondary User
Technical power users who don't necessarily code but understand data structures. They understand what a "field type" means, they've used Airtable, they want more control without learning to code.

### The Builder (Sharann)
First-year CSE student at VIT Chennai. CGPA 8.73. Active GitHub: github.com/sharann-del. Projects: TreeGPT, Terminaltype, NotionWidgets, Planner. Wants a single place to manage academics, projects, health, finance, and schedule. Hates being put in a box by existing tools. Owns Cursor Pro. Has an existing Supabase familiarity. Values accuracy over embellishment.

---

## 4. Technical Stack — Full Specification

### 4.1 Frontend Dependencies

#### Core Framework
- **React 18.3+** — UI framework. Concurrent mode features available (useTransition, Suspense).
- **Vite 5+** — Build tool. HMR for dev. Rollup for production build. Use `@vitejs/plugin-react` for JSX transform.
- **TypeScript 5.4+** — Strict mode enabled. `strict: true` in tsconfig. All components fully typed. No `any` except in truly dynamic contexts.

#### Styling
- **Tailwind CSS 3.4+** — Utility-first. Custom config for Kern's design tokens (colors, spacing, border radius). No component libraries that impose design opinions.
- **tailwind-merge** (`twMerge`) — Merge conflicting Tailwind classes safely in component variants.
- **clsx** — Conditional class composition. Used alongside twMerge in a `cn()` utility.

#### UI Primitives (Radix UI)
All Radix primitives are headless — they provide behavior and accessibility, zero styling. Kern styles them with Tailwind.
- `@radix-ui/react-dialog` — Modals
- `@radix-ui/react-popover` — Popovers (date pickers, color pickers, field options)
- `@radix-ui/react-dropdown-menu` — Context menus, action menus
- `@radix-ui/react-select` — Dropdowns
- `@radix-ui/react-checkbox` — Boolean field cells
- `@radix-ui/react-tooltip` — Tooltips
- `@radix-ui/react-scroll-area` — Custom scrollbars
- `@radix-ui/react-tabs` — View tabs in Collection header
- `@radix-ui/react-separator` — Visual dividers
- `@radix-ui/react-avatar` — User avatar in topbar
- `@radix-ui/react-context-menu` — Right-click menus on rows
- `@radix-ui/react-toggle` — Toggle buttons (sidebar collapse, etc.)
- `@radix-ui/react-collapsible` — Sidebar groups

#### Command Palette
- **cmdk 1.0+** — The command palette primitive. Used by Linear, Vercel, shadcn/ui. Provides `Command`, `Command.Input`, `Command.List`, `Command.Item`, `Command.Group`, `Command.Empty`. Fully keyboard-navigable out of the box.

#### State Management
- **Zustand 4.5+** — Minimal global state for UI state (sidebar open/closed, active collection, palette open, row editor open, etc.). Not used for server data — that's TanStack Query's job.

#### Server State & Data Fetching
- **TanStack Query (React Query) v5** — All Supabase queries wrapped in `useQuery`. All mutations wrapped in `useMutation`. Provides caching, background refetch, optimistic updates, and cache invalidation. Query keys follow a hierarchical pattern: `['collections', userId]`, `['rows', collectionId]`, `['fields', collectionId]`.

#### Table Primitive
- **TanStack Table v8** — Headless table engine. Powers the Table view. Provides column sizing, sorting, selection, virtual rows. Kern renders its own cells and headers using Tailwind.

#### Code Editor
- **@monaco-editor/react** — Monaco editor wrapped for React. Used in the Views as Code editor. TypeScript language mode. Custom type definitions injected for `KernViewProps`. Full IntelliSense for the Kern view API.

#### Routing
- **React Router v6.24+** — Client-side routing. `createBrowserRouter` with `RouterProvider`. Nested routes for collection views. Protected route wrapper for auth.

#### Date Handling
- **date-fns 3.6+** — Date formatting, parsing, manipulation. Used in date/datetime cell editors, calendar view, and row editor.

#### Drag and Drop
- **@dnd-kit/core + @dnd-kit/sortable** — Drag-and-drop for Kanban cards, sidebar reordering, dashboard widget reordering, field reordering. More stable than react-beautiful-dnd and works with React 18 concurrent mode.

#### Icons
- **Lucide React 0.400+** — Consistent, clean icon set. Used throughout. Each icon is a React component, tree-shakeable.

#### File Uploads
- **@supabase/storage-js** (bundled with supabase-js) — File uploads to Supabase Storage for `file` field types and avatar uploads.

#### Toast Notifications
- **Sonner** — The best toast library for React. Stacked toasts, promise toasts (for async operations), undo action support. Integrates seamlessly with Tailwind.

#### Rich Text (light)
- **@tiptap/react + @tiptap/starter-kit** — Minimal rich text for `rich_text` field type. Only bold, italic, lists, links. No full document editing. Just in-cell rich text for the row editor.

#### Virtualization
- **@tanstack/react-virtual** — Virtual row rendering for large collections in the Table view. Enables smooth scrolling through 10,000+ rows.

### 4.2 Backend (Supabase)

- **Supabase JS v2** (`@supabase/supabase-js`) — The frontend client. Handles auth sessions, database queries, storage uploads, realtime subscriptions. Singleton pattern in `src/lib/supabase.ts`.
- **Postgres 15** (via Supabase) — The actual database. JSONB for row data. GIN indexes for JSONB queries. pg_cron for scheduled sync jobs.
- **Supabase Auth** — Email/password, magic link, and Google OAuth. Row Level Security enforced via JWT.
- **Supabase Realtime** — Postgres change streams. Frontend subscribes to row changes for live source collections and gets real-time updates when background sync adds/updates rows.
- **Supabase Edge Functions** (Deno) — Background sync jobs for live sources, the MCP server, webhook handlers. Deployed at `https://<project>.supabase.co/functions/v1/<name>`.
- **Supabase Storage** — File attachments for `file` field type. Avatars. Bucket: `kern-files`, access: private. Bucket: `kern-avatars`, access: public.
- **pg_cron** — Scheduled jobs for periodic live source sync. Enabled as a Postgres extension.

### 4.3 Dev Tooling

- **ESLint 9+** — Flat config. `@typescript-eslint/recommended`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. No AirBnB config (too strict for fast development).
- **Prettier 3+** — Code formatting. Single quotes, semicolons, 100 char width. `.prettierrc` committed.
- **Husky + lint-staged** — Pre-commit hook runs ESLint and Prettier on staged files only. Fast.
- **Supabase CLI** — Local Postgres stack, migration runner, type generator, Edge Function local dev server. `supabase start` spins up local Postgres, Auth, Studio, and API.

---

## 5. System Architecture

```
╔══════════════════════════════════════════════════════════════════╗
║                        KERN FRONTEND                             ║
║            React 18 + Vite + TypeScript + Tailwind               ║
║                                                                  ║
║  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ║
║  │  Collections   │  │   Views Engine   │  │  Cmd+K Palette  │  ║
║  │    Engine      │  │ Table / Kanban / │  │  (cmdk + Zustand│  ║
║  │ (CRUD + schema)│  │ Calendar/Gallery │  │   command store)│  ║
║  └────────────────┘  │ /List /Custom    │  └─────────────────┘  ║
║                      └──────────────────┘                        ║
║  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐  ║
║  │   Relations    │  │    Dashboard     │  │  Monaco Editor  │  ║
║  │    Engine      │  │  Widget Grid     │  │  Views as Code  │  ║
║  └────────────────┘  └──────────────────┘  └─────────────────┘  ║
║                                                                  ║
║  ┌────────────────────────────────────────────────────────────┐  ║
║  │          TanStack Query — Server State Cache               │  ║
║  │  Collections | Fields | Rows | Views | Relations | Widgets │  ║
║  └────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║  ┌──────────────────────────────────────────────────────────┐    ║
║  │         Zustand — UI State                               │    ║
║  │  sidebar / palette / activeCollection / rowEditor        │    ║
║  └──────────────────────────────────────────────────────────┘    ║
╚════════════════════════════╦═════════════════════════════════════╝
                             ║ supabase-js (HTTP + WebSocket)
╔════════════════════════════╩═════════════════════════════════════╗
║                          SUPABASE                                ║
║                                                                  ║
║  ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐ ║
║  │    Postgres 15   │  │  Auth + RLS  │  │     Realtime       │ ║
║  │  public.profiles │  │  JWT-scoped  │  │  Row change stream │ ║
║  │  public.collections  │  │  Row Level   │  │  for live sources  │ ║
║  │  public.fields   │  │  Security    │  │  + manual updates  │ ║
║  │  public.rows     │  └──────────────┘  └────────────────────┘ ║
║  │  public.views    │                                            ║
║  │  public.row_rels │  ┌──────────────┐  ┌────────────────────┐ ║
║  │  public.widgets  │  │   Storage    │  │   Edge Functions   │ ║
║  │  public.cv_reg   │  │  kern-files  │  │  /kern-mcp         │ ║
║  └──────────────────┘  │  kern-avatars│  │  /sync-github      │ ║
║                        └──────────────┘  │  /sync-gcal        │ ║
║                                          │  /sync-notion      │ ║
║                                          │  /sync-linear      │ ║
║                                          │  /sync-rss         │ ║
║                                          └────────────────────┘ ║
╚══════════════════════════════════════════╦═══════════════════════╝
                                           ║ MCP protocol
╔══════════════════════════════════════════╩═══════════════════════╗
║                     KERN MCP SERVER                              ║
║          (Supabase Edge Function: /functions/v1/kern-mcp)        ║
║                                                                  ║
║  list_collections | query_rows | create_row | update_row        ║
║  delete_row | create_collection | add_field | list_fields        ║
╚══════════════════════════════════════════╦═══════════════════════╝
                                           ║
╔══════════════════════════════════════════╩═══════════════════════╗
║                        CLAUDE                                    ║
║           Natural language read/write to Kern workspace          ║
║  "Add a task called Deploy Kern to my Projects collection"       ║
╚══════════════════════════════════════════════════════════════════╝
```

### Data flow for a row create
1. User types in inline table cell or Cmd+K → "Add row to Books"
2. `useRows` mutation fires — optimistic update adds row to TanStack Query cache immediately
3. UI shows new row instantly
4. Supabase JS `insert` call made in background
5. On success: cache updated with server-generated `id`, `created_at`
6. On failure: optimistic update rolled back, Sonner toast shows error with retry option

### Data flow for a live source sync
1. pg_cron fires `sync-github` Edge Function every 15 minutes
2. Edge Function fetches GitHub API with stored user OAuth token
3. Upserts rows into `rows` table (using `external_id` for deduplication)
4. Updates `collections.last_synced_at`
5. Supabase Realtime broadcasts change to frontend
6. TanStack Query cache invalidated for that collection's rows
7. Table view auto-updates without user doing anything

---

## 6. Complete Database Schema

All tables in `public` schema. RLS enabled on all. All user data scoped via `user_id = auth.uid()`.

### 6.1 profiles

```sql
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  preferences jsonb not null default '{}',
  -- preferences shape: { theme: 'light'|'dark', sidebar_collapsed: bool }
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view and edit own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
```

### 6.2 collections

```sql
create table public.collections (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  name                text not null,
  slug                text not null,           -- url-safe, unique per user
  icon                text,                    -- emoji character
  color               text,                    -- hex color string e.g. '#5b5bd6'
  description         text,
  is_live_source      boolean not null default false,
  live_source_type    text,
  -- live_source_type values:
  -- 'github_prs' | 'github_issues' | 'github_repos'
  -- 'google_calendar_events'
  -- 'notion_database'
  -- 'linear_issues' | 'linear_projects'
  -- 'rss_feed'
  -- 'akiflow_tasks'
  -- 'apple_calendar_events'
  live_source_config  jsonb,
  -- config shape per type documented in Live Sources section
  last_synced_at      timestamptz,
  sync_status         text default 'idle',
  -- sync_status values: 'idle' | 'syncing' | 'error'
  sync_error_message  text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(user_id, slug)
);

alter table public.collections enable row level security;
create policy "Users can manage own collections"
  on public.collections for all
  using (auth.uid() = user_id);

create trigger collections_updated_at
  before update on public.collections
  for each row execute procedure public.handle_updated_at();
```

### 6.3 fields

```sql
create table public.fields (
  id                       uuid default gen_random_uuid() primary key,
  collection_id            uuid references public.collections(id) on delete cascade not null,
  user_id                  uuid references public.profiles(id) on delete cascade not null,
  name                     text not null,
  slug                     text not null,      -- snake_case, unique per collection
  type                     text not null,
  -- type values:
  -- 'text' | 'rich_text' | 'number' | 'date' | 'datetime'
  -- 'boolean' | 'select' | 'multi_select' | 'url' | 'email'
  -- 'phone' | 'relation' | 'file'
  options                  jsonb,
  -- For 'select' / 'multi_select':
  --   { items: [{ id: string, label: string, color: string, sort_order: number }] }
  -- For 'number':
  --   { unit: string, decimal_places: number, show_as_progress: boolean, min: number, max: number }
  -- For 'relation':
  --   { target_collection_id: string, display: 'single' | 'multiple' }
  -- For 'file':
  --   { max_size_mb: number, allowed_types: string[] }
  is_required              boolean not null default false,
  is_primary               boolean not null default false,   -- the "title" of each row
  is_hidden_by_default     boolean not null default false,
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now(),
  unique(collection_id, slug)
);

alter table public.fields enable row level security;
create policy "Users can manage own fields"
  on public.fields for all
  using (auth.uid() = user_id);
```

### 6.4 rows

```sql
create table public.rows (
  id            uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  data          jsonb not null default '{}',
  -- data shape: { [field_slug]: value }
  -- text: string
  -- number: number
  -- date: 'YYYY-MM-DD' string
  -- datetime: ISO8601 string
  -- boolean: boolean
  -- select: string (option id)
  -- multi_select: string[] (array of option ids)
  -- url/email/phone: string
  -- relation: handled separately in row_relations table
  -- file: { path: string, name: string, size: number, type: string }[]
  -- rich_text: string (HTML from tiptap)
  external_id   text,         -- for live source rows; prevents duplicate sync
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.rows enable row level security;
create policy "Users can manage own rows"
  on public.rows for all
  using (auth.uid() = user_id);

create trigger rows_updated_at
  before update on public.rows
  for each row execute procedure public.handle_updated_at();
```

### 6.5 row_relations

```sql
create table public.row_relations (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  source_row_id  uuid references public.rows(id) on delete cascade not null,
  target_row_id  uuid references public.rows(id) on delete cascade not null,
  field_id       uuid references public.fields(id) on delete cascade not null,
  created_at     timestamptz not null default now(),
  unique(source_row_id, target_row_id, field_id)
);

alter table public.row_relations enable row level security;
create policy "Users can manage own row relations"
  on public.row_relations for all
  using (auth.uid() = user_id);
```

### 6.6 views

```sql
create table public.views (
  id               uuid default gen_random_uuid() primary key,
  collection_id    uuid references public.collections(id) on delete cascade not null,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  name             text not null,
  type             text not null,
  -- type values: 'table' | 'kanban' | 'calendar' | 'gallery' | 'list' | 'custom'
  config           jsonb not null default '{}',
  -- config shape:
  -- {
  --   hidden_fields: string[],          -- field slugs to hide
  --   filters: FilterRule[],
  --   sorts: SortRule[],
  --   group_by_field: string | null,    -- field slug (kanban, grouped table)
  --   calendar_date_field: string | null, -- field slug for calendar view
  --   gallery_cover_field: string | null, -- field slug for gallery cover
  --   gallery_card_fields: string[],    -- field slugs shown on gallery card
  --   table_column_widths: { [fieldSlug]: number }, -- pixels
  --   kanban_collapsed_columns: string[], -- option ids
  -- }
  -- FilterRule: { id: string, field_slug: string, operator: string, value: any }
  -- SortRule: { id: string, field_slug: string, direction: 'asc' | 'desc' }
  custom_view_id   uuid references public.custom_views_registry(id) on delete set null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.views enable row level security;
create policy "Users can manage own views"
  on public.views for all
  using (auth.uid() = user_id);

create trigger views_updated_at
  before update on public.views
  for each row execute procedure public.handle_updated_at();
```

### 6.7 dashboard_widgets

```sql
create table public.dashboard_widgets (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  type        text not null,
  -- type values:
  -- 'collection_stats' | 'recent_rows' | 'view_embed'
  -- 'live_source_status' | 'quick_add'
  title       text,
  config      jsonb not null default '{}',
  -- config per type:
  -- collection_stats: { collection_id: string }
  -- recent_rows: { collection_id: string, limit: number, show_fields: string[] }
  -- view_embed: { collection_id: string, view_id: string }
  -- live_source_status: { collection_id: string }
  -- quick_add: { collection_id: string, prefill: Record<string, any> }
  position_x  integer not null,
  position_y  integer not null,
  width       integer not null default 2,     -- in grid columns
  height      integer not null default 2,     -- in grid rows
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.dashboard_widgets enable row level security;
create policy "Users can manage own widgets"
  on public.dashboard_widgets for all
  using (auth.uid() = user_id);
```

### 6.8 custom_views_registry

```sql
create table public.custom_views_registry (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  description     text,
  code            text not null,          -- full JSX/TSX component source
  compiled_code   text,                   -- babel-compiled output (cached)
  is_published    boolean not null default false,
  published_slug  text unique,
  thumbnail_url   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.custom_views_registry enable row level security;
create policy "Users can manage own custom views"
  on public.custom_views_registry for all
  using (auth.uid() = user_id);

-- Public views are readable by anyone (for gallery feature)
create policy "Published custom views are public"
  on public.custom_views_registry for select
  using (is_published = true);
```

### 6.9 Indexes

```sql
-- rows: most critical for performance
create index rows_collection_id_user_id_idx on public.rows(collection_id, user_id);
create index rows_external_id_idx on public.rows(external_id) where external_id is not null;
create index rows_created_at_idx on public.rows(created_at desc);
create index rows_data_gin_idx on public.rows using gin(data);  -- JSONB queries

-- fields
create index fields_collection_id_idx on public.fields(collection_id);
create index fields_sort_order_idx on public.fields(collection_id, sort_order);

-- views
create index views_collection_id_idx on public.views(collection_id);

-- relations
create index row_relations_source_idx on public.row_relations(source_row_id);
create index row_relations_target_idx on public.row_relations(target_row_id);
create index row_relations_field_idx on public.row_relations(field_id);

-- collections
create index collections_user_id_idx on public.collections(user_id);
create index collections_sort_order_idx on public.collections(user_id, sort_order);
```

### 6.10 Database Functions & Triggers

```sql
-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Get row count for a collection (used in sidebar badge)
create or replace function public.get_collection_row_count(p_collection_id uuid)
returns bigint
language sql
security definer
as $$
  select count(*) from public.rows
  where collection_id = p_collection_id
  and user_id = auth.uid();
$$;
```

---

## 7. TypeScript Type Definitions

These live in `src/types/kern.ts`. The database types are auto-generated from Supabase CLI into `src/types/database.ts`.

```typescript
// src/types/kern.ts

export type FieldType =
  | 'text'
  | 'rich_text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'email'
  | 'phone'
  | 'relation'
  | 'file';

export type ViewType = 'table' | 'kanban' | 'calendar' | 'gallery' | 'list' | 'custom';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type LiveSourceType =
  | 'github_prs'
  | 'github_issues'
  | 'github_repos'
  | 'google_calendar_events'
  | 'notion_database'
  | 'linear_issues'
  | 'linear_projects'
  | 'rss_feed'
  | 'akiflow_tasks'
  | 'apple_calendar_events';

// ─── Select Options ───────────────────────────────────────────────

export interface SelectOption {
  id: string;
  label: string;
  color: string;  // hex, e.g. '#e879f9'
  sort_order: number;
}

export interface SelectFieldOptions {
  items: SelectOption[];
}

export interface NumberFieldOptions {
  unit?: string;
  decimal_places?: number;
  show_as_progress?: boolean;
  min?: number;
  max?: number;
}

export interface RelationFieldOptions {
  target_collection_id: string;
  display: 'single' | 'multiple';
}

export interface FileFieldOptions {
  max_size_mb?: number;
  allowed_types?: string[];  // MIME types
}

export type FieldOptions =
  | SelectFieldOptions
  | NumberFieldOptions
  | RelationFieldOptions
  | FileFieldOptions
  | null;

// ─── Core Entities ───────────────────────────────────────────────

export interface KernProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme: 'light' | 'dark';
    sidebar_collapsed: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface KernCollection {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon: string | null;        // emoji
  color: string | null;       // hex
  description: string | null;
  is_live_source: boolean;
  live_source_type: LiveSourceType | null;
  live_source_config: Record<string, unknown> | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error_message: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Client-side computed
  row_count?: number;
}

export interface KernField {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  slug: string;
  type: FieldType;
  options: FieldOptions;
  is_required: boolean;
  is_primary: boolean;
  is_hidden_by_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface KernRow {
  id: string;
  collection_id: string;
  user_id: string;
  data: Record<string, unknown>;
  external_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Client-side computed
  relations?: Record<string, KernRow[]>;  // field_slug -> related rows
}

export interface KernView {
  id: string;
  collection_id: string;
  user_id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  custom_view_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ViewConfig {
  hidden_fields: string[];
  filters: FilterRule[];
  sorts: SortRule[];
  group_by_field: string | null;
  calendar_date_field: string | null;
  gallery_cover_field: string | null;
  gallery_card_fields: string[];
  table_column_widths: Record<string, number>;
  kanban_collapsed_columns: string[];
}

export interface FilterRule {
  id: string;
  field_slug: string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'lt' | 'gte' | 'lte'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'
  | 'is_true' | 'is_false'
  | 'before' | 'after' | 'on';

export interface SortRule {
  id: string;
  field_slug: string;
  direction: 'asc' | 'desc';
}

export interface KernRowRelation {
  id: string;
  user_id: string;
  source_row_id: string;
  target_row_id: string;
  field_id: string;
  created_at: string;
}

// ─── Custom Views ─────────────────────────────────────────────────

export interface KernCustomView {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  code: string;
  compiled_code: string | null;
  is_published: boolean;
  published_slug: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// The props interface injected into every custom view
export interface KernViewProps {
  rows: KernRow[];
  fields: KernField[];
  collectionName: string;
  onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  onRowCreate: (data: Record<string, unknown>) => Promise<void>;
  onRowDelete: (rowId: string) => Promise<void>;
  onRowClick: (rowId: string) => void;
}

// ─── Dashboard ────────────────────────────────────────────────────

export type DashboardWidgetType =
  | 'collection_stats'
  | 'recent_rows'
  | 'view_embed'
  | 'live_source_status'
  | 'quick_add';

export interface DashboardWidget {
  id: string;
  user_id: string;
  type: DashboardWidgetType;
  title: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
}
```

---

## 8. Core Concepts & Terminology

### Collection
A user-defined data table. The fundamental unit of Kern. A Collection has a name, icon (emoji), color, and a set of Fields. It stores Rows. It can be a **manual collection** (user enters data by hand) or a **live source collection** (auto-synced from an external API). Both look and behave identically in the UI. Every Collection has at least one Field marked as `is_primary = true`, which acts as the display name of each Row.

**Example collections a user might create:**
- Books (fields: Title, Author, Status, Rating, Date Finished)
- Workouts (fields: Date, Type, Duration, Notes, Energy Level)
- Projects (fields: Name, Status, GitHub URL, Deadline, Priority)
- Expenses (fields: Amount, Category, Date, Description, Recurring)
- Courses (fields: Name, Platform, Progress, Certificate URL)
- Goals (fields: Title, Target Date, Status, Related Project)

### Field
A column in a Collection. Has a name, slug (snake_case identifier), type, and type-specific options. Field slugs are used as keys in row `data` JSONB. Every Collection has exactly one primary Field (`is_primary = true`) — this is the "title" of each Row, shown in relation pills, Kanban cards, and everywhere a Row needs to be referenced by a single string.

### Row
A single entry in a Collection. Its data is stored as JSONB in `rows.data`, keyed by Field slug. Example: `{ "title": "The Pragmatic Programmer", "author": "Hunt & Thomas", "status": "option_id_done", "rating": 5 }`. Rows from Live Sources have an `external_id` (e.g., GitHub PR number) to prevent duplicate inserts on re-sync.

### View
A saved way of looking at a Collection. A Collection can have multiple Views. Each View has a type (Table, Kanban, Calendar, Gallery, List, or Custom) and a config (filters, sorts, visible fields, group-by field, etc.). Views are per-collection and saved in the `views` table. Switching Views is instant — data is the same, just rendered differently with different filters/sorts applied.

### Live Source
An external service connected to Kern that automatically syncs data into a Collection. Examples: GitHub PRs, Google Calendar events, Notion databases, Linear issues. Live Source Collections look and behave identically to manual Collections — the only difference is the `is_live_source` flag and `live_source_type`/`live_source_config` metadata fields on the Collection. Users cannot manually create rows in Live Source Collections (the rows are owned by the sync). They can, however, add additional Fields to Live Source Collections (which are stored locally and not synced back to the source).

### Relation
A typed link from a Row in one Collection to one or more Rows in another Collection (or the same Collection). Defined by a Field of type `relation` on a Collection, pointing to a target Collection. The actual links are stored in the `row_relations` table. Relations are bidirectional — if Collection A has a relation field pointing to Collection B, rows in Collection B show a "Referenced by" section listing all rows from Collection A that link to them.

### Dashboard
The home screen of Kern. A configurable grid of widgets. Each widget shows a slice of data from any Collection. Widget types: collection stats (row count, last updated), recent rows (last N rows from a Collection), view embed (render any saved View as a widget), live source status (sync health and last sync time), and quick-add (add a row to a Collection directly from the dashboard without navigating to it).

### Command Palette (Cmd+K)
The primary interface for all actions in Kern. Opened with Cmd+K (or Ctrl+K on Windows/Linux). Closed with Escape. Every action in the app — navigate to a Collection, create a row, change a field, connect a live source, open settings, filter a view — is available as a command. The palette is schema-aware: it knows your Collection names, Field names, and View names. Commands are fuzzy-searched. Recent commands are promoted.

### Views as Code
The differentiating power feature. Users can write React functional components that render as Views on any Collection. The component receives the standard `KernViewProps` interface. Written in a Monaco editor inside the app. Compiled in the browser with Babel. Executed in a sandboxed iframe. Saved to `custom_views_registry`. Available as a View on any Collection the user assigns it to.

### MCP Server
A Model Context Protocol server running as a Supabase Edge Function at `/functions/v1/kern-mcp`. Exposes the user's Kern workspace to Claude. The user adds the endpoint URL + their JWT to Claude's MCP settings once. Claude can then create, read, update, and delete any data in their Kern workspace using natural language.

---

## 9. Authentication System

### 9.1 Auth Methods
- **Email + Password** — Standard Supabase auth. User registers with email/password, receives confirmation email, logs in.
- **Magic Link** — Supabase passwordless auth. User enters email, receives a one-time login link. Preferred for simplicity.
- **Google OAuth** — Phase 2. One-click sign in with Google. User's avatar and name auto-populated from Google profile.

### 9.2 Auth Flow
```
/login → user submits credentials → supabase.auth.signInWithPassword()
                                  → session stored in localStorage (supabase default)
                                  → redirect to /dashboard

/signup → user submits email+password → supabase.auth.signUp()
                                      → trigger creates profile row
                                      → redirect to /dashboard (or email confirmation if enabled)

Protected routes → AuthProvider checks supabase.auth.getSession()
                → If no session: redirect to /login
                → If session: render app with user context

Sign out → supabase.auth.signOut() → clear session → redirect to /login
```

### 9.3 AuthProvider
Located at `src/providers/AuthProvider.tsx`. Wraps the entire app. Provides:
- `user: User | null` — the authenticated Supabase user
- `profile: KernProfile | null` — the Kern profile row
- `loading: boolean` — true while session is being fetched
- `signIn(email, password)` — calls supabase auth
- `signUp(email, password, fullName)` — calls supabase auth
- `signInWithMagicLink(email)` — calls supabase auth
- `signOut()` — calls supabase auth
- `updateProfile(data)` — updates profile row

### 9.4 Protected Route
```tsx
// src/components/auth/ProtectedRoute.tsx
// Wraps all authenticated routes
// If loading: show full-screen skeleton
// If no user: redirect to /login
// If user: render children
```

### 9.5 Row Level Security
All Supabase queries made from the frontend use the anon key and the user's JWT (automatically sent by supabase-js after sign-in). RLS policies on every table ensure users can only ever see and modify their own data. Even if someone intercepts the anon key, they cannot access another user's data without a valid JWT.

---

## 10. Collections Engine

### 10.1 Creating a Collection

The "Create Collection" flow opens as a Modal (Radix Dialog). Fields in the form:
- **Name** (required, text input) — e.g., "My Books"
- **Slug** (auto-generated from name, editable) — e.g., "my-books". Validated: lowercase, alphanumeric + hyphens only, max 60 chars, unique for user.
- **Icon** (optional) — emoji picker. Clicking opens a Radix Popover with an emoji grid. Default: "📦"
- **Color** (optional) — preset palette of 12 colors shown as swatches. Default: `#6366f1`
- **Description** (optional) — single-line text input.

On submit:
1. Insert into `collections`
2. Insert default primary field: `{ name: 'Name', slug: 'name', type: 'text', is_primary: true }`
3. Invalidate `['collections', userId]` query
4. Navigate to `/c/[slug]`
5. Close modal

### 10.2 Editing a Collection
Edit modal is identical to Create modal but pre-populated. Slug is not editable after creation (would break URLs and relations). Saving updates `name`, `icon`, `color`, `description` on the `collections` row.

### 10.3 Deleting a Collection
Delete confirmation dialog. Shows: Collection name, icon, row count, warning "This will permanently delete [N] rows and [M] fields. This cannot be undone." User must type the collection name to confirm (same pattern as GitHub repository deletion). On confirm: delete `collections` row (cascades to all fields, rows, views, relations via FK). Invalidate queries. Navigate to `/dashboard`.

### 10.4 Reordering Collections
Sidebar uses `@dnd-kit/sortable`. Drag handle appears on hover (6-dot icon). On drop: update `sort_order` of all moved collections in a single Supabase `upsert` call. Optimistic update in Zustand sidebar state.

### 10.5 Collection Sidebar Entry
Each collection in the sidebar shows:
- Icon (emoji, 16px)
- Name (truncated with ellipsis after 140px)
- Row count badge (light gray, only visible on hover or if ≤ 0 — empty shown always)
- Hover: shows ⋯ action menu button
- ⋯ menu: Edit, Duplicate, Delete, Add view, Connect live source
- Active collection: indigo-tinted background, bold name

### 10.6 Collection Header (in main area)
When a Collection is open:
```
[icon] Collection Name        [🔄 Synced 2m ago] (only if live source)
─────────────────────────────────────────────────────────────────
[Table ×] [Kanban] [+ Add view]      [Filter (N)] [Sort] [Fields] [⋯]
```
- View tabs use Radix Tabs. Active tab highlighted.
- Filter/Sort show count badges when active filters/sorts exist.
- Fields button opens a popover showing all fields with visibility toggles (per-view).
- ⋯ menu: Edit collection, Connect live source, Export as CSV, Delete collection.

### 10.7 Collection List Query
```typescript
// src/hooks/useCollections.ts
export function useCollections() {
  return useQuery({
    queryKey: ['collections', userId],
    queryFn: () =>
      supabase
        .from('collections')
        .select('*, rows(count)')
        .order('sort_order', { ascending: true })
        .throwOnError(),
    select: (data) => data.data ?? [],
    staleTime: 60_000,
  });
}
```

---

## 11. Fields Engine

### 11.1 Field Types — Full Specification

#### `text`
- Single-line string. Max 4000 chars.
- Cell renders as plain text, inline editable on click.
- In row editor: full-width text input.
- Primary field uses this type.

#### `rich_text`
- Multi-line text with Tiptap mini-editor (bold, italic, bullet list, ordered list, links only).
- Cell in table view renders plain text (stripped HTML). In row editor: full Tiptap editor.
- Stored as HTML string in `data`.

#### `number`
- Stores numeric values. Supports decimal.
- Options: `unit` (string shown after number, e.g., "kg", "hrs", "%"), `decimal_places` (0–4), `show_as_progress` (renders as progress bar using `min`/`max`), `min`/`max` (for progress display).
- Cell: right-aligned number input.

#### `date`
- Date only, no time. Stored as `YYYY-MM-DD`.
- Cell: renders formatted date (e.g., "Mar 22, 2026"). Click opens Radix Popover with a date picker calendar.
- Supports relative display: "Today", "Tomorrow", "3 days ago" for recent dates.

#### `datetime`
- Full ISO8601 timestamp.
- Cell: renders date + time. Popover: date picker + time input.

#### `boolean`
- True/false. Stored as boolean in JSONB.
- Cell: Radix Checkbox. Click toggles. No extra click needed — toggle directly in table.

#### `select`
- Single choice from user-defined options.
- Each option: `{ id: string (uuid), label: string, color: string (hex), sort_order: number }`.
- Cell: shows colored pill with option label. Click opens dropdown to change.
- In row editor: dropdown with all options shown as colored pills.
- Options managed in Field settings: add, rename, recolor, reorder (drag), delete.

#### `multi_select`
- Multiple choices from user-defined options. Stored as `string[]` (array of option ids).
- Cell: shows multiple colored pills. Click opens multi-select dropdown.
- In row editor: same.

#### `url`
- URL string with validation.
- Cell: shows truncated URL with external link icon. Cmd/Ctrl+Click opens in new tab.
- In row editor: text input + open button.

#### `email`
- Email string with validation.
- Cell: shows email, click opens `mailto:` link.
- In row editor: email input.

#### `phone`
- Phone number string (no strict format validation — international numbers vary).
- Cell: plain text, click opens `tel:` link.

#### `relation`
- Links to rows in another Collection (or same Collection).
- Stored separately in `row_relations` table, not in row `data`.
- Options: `target_collection_id` (which Collection to link to), `display` (`single` shows one, `multiple` shows many).
- Cell in table: shows pills with target row primary field value.
- In row editor: row picker popover — search bar, list of target collection rows, click to add.
- Clicking a relation pill opens that row's editor.
- Reverse relations shown in row editor under "Referenced by [Collection Name]" collapsible section.

#### `file`
- File attachments. Stored as array of `{ path, name, size, type }` in `data`.
- Actual files stored in Supabase Storage bucket `kern-files` at path `{user_id}/{collection_id}/{row_id}/{filename}`.
- Cell: shows file count badge + first file name. Click opens file list popover.
- In row editor: drag-drop upload zone + file list with delete.
- Options: `max_size_mb`, `allowed_types`.

### 11.2 Adding a Field
The "Add Field" panel slides in from the right side (not a modal — keeps the collection visible). Contains:
- Field name input (required)
- Field type selector (radio/grid of type options with icons)
- Type-specific options section (conditionally rendered based on type)
- Is required toggle
- Save button

On save: insert into `fields`. Invalidate `['fields', collectionId]`. Close panel.

### 11.3 Editing a Field
Same panel as Add but pre-populated. Type cannot be changed after creation (data incompatibility risk — user must delete and recreate). Name and slug can be updated, but slug changes require migrating `data` JSONB keys in all rows (this is handled by a migration prompt: "Renaming the field slug will update all row data. This may take a moment.").

### 11.4 Deleting a Field
Warning dialog: "Deleting [Field Name] will remove this data from all [N] rows. This cannot be undone." On confirm: delete field from `fields`. Remove that field's key from all rows' JSONB via `UPDATE rows SET data = data - 'field_slug' WHERE collection_id = ?`. Invalidate queries.

### 11.5 Field Visibility Per View
Each View's `config.hidden_fields` is an array of field slugs. Fields menu in the Collection header shows all fields with toggle checkboxes. Toggling updates the View's config. Hidden fields are not shown as columns in that View, but they are still available in filters, sorts, and the row editor.

---

## 12. Rows Engine

### 12.1 Creating a Row

**Inline in Table View:**
The last row in the table is an empty "add row" row. Clicking it — or pressing Enter at the end of the last row — creates a new row with an empty primary field, focuses the primary field cell for editing, and submits on Enter or Tab.

**Full Row Editor:**
Cmd+K → "Add row to [Collection]" opens the row editor panel on the right side in creation mode. All fields shown. Save button. Keyboard shortcut: Cmd+Enter to save.

**Quick add from Dashboard widget:**
A "Quick Add" widget lets you add a row to any Collection directly from the dashboard. Shows only the primary field by default, with an option to expand all fields.

### 12.2 Row Editor Panel
Right-side panel, 480px wide. Slides in from the right. Does not replace the main view — pushes or overlays it.

Contents:
- Collection icon + name at top
- Created at / Updated at in subtle gray
- Each field as a labeled section:
  - Label: field name + type icon + required indicator
  - Value: field-type appropriate editor
- Relations section: each `relation` field shows a row picker
- "Referenced by" section: collapsible list of rows from other Collections that link to this row
- "Created [date] · Updated [date]" footer
- Delete row button (danger, at bottom)
- Close button (X) at top right

Keyboard shortcuts inside row editor:
- `Escape` — close editor
- `Tab` — move to next field
- `Shift+Tab` — move to previous field
- `Cmd+Enter` — save (for unsaved changes)

### 12.3 Inline Cell Editing
Clicking a cell in the Table view puts it into edit mode. Behavior:
- `Enter` or clicking away — confirm edit, save to Supabase
- `Escape` — cancel edit, revert to previous value
- `Tab` — confirm and move to next cell (right)
- `Shift+Tab` — confirm and move to previous cell (left)
- Arrow keys (for text cells with cursor at start/end) — move to adjacent row

Save triggers an optimistic update (updates TanStack Query cache immediately) + background Supabase `update`.

### 12.4 Bulk Operations
Checkbox column on the leftmost side of the table. Click header checkbox: select all visible rows. Click row checkbox: select/deselect row. With rows selected, a floating action bar appears at the bottom of the view:
- "[N] rows selected"
- "Delete [N] rows" (danger, confirmation required)
- "Duplicate [N] rows"
- "Update field..." (bulk field update — select a field + new value → applies to all selected)
- "Clear selection"

### 12.5 Row Context Menu
Right-click on a row (or click ⋯ icon on row hover) opens a Radix ContextMenu:
- Open (expand to full editor)
- Duplicate
- Copy row link (deep link to this row)
- Delete (confirmation inline in menu)

---

## 13. Views System

### 13.1 Table View

**Built with TanStack Table v8.** The most-used view. Full spreadsheet-like experience.

**Column rendering:**
- Each Field is a column.
- Column header: field icon + field name. Click header to sort (cycles: none → asc → desc → none). Right-click column header: rename field, hide field, add field before/after, delete field.
- Column width: resizable by dragging the column border. Width saved to `view.config.table_column_widths`.
- Minimum column width: 100px. Maximum: 600px.
- Primary field column is frozen (sticky left).

**Row rendering:**
- Row height: fixed at 36px for compact mode, 52px for comfortable mode (toggle in view options).
- Each cell renders the appropriate CellRenderer component based on field type.
- Row hover: shows row checkbox + ⋯ action button on the right.
- Row click (not on a cell): opens row editor panel.
- Row expand button (↗ icon): opens row editor.

**Virtual scrolling:**
TanStack Virtual (`@tanstack/react-virtual`) for collections with > 200 rows. Renders only visible rows + 10px overscan. Enables smooth scrolling through 10,000+ rows without performance degradation.

**Footer:**
Row count at bottom left. "+ Add row" button at bottom left. Pagination controls at bottom right (if pagination mode enabled).

### 13.2 Kanban View

Groups rows by a `select` field. Each select option = one column. Rows = cards within columns.

**Column:**
- Header: option color swatch + option label + card count.
- Collapse button (→ arrow): collapses column to show only the header vertically. Collapsed state stored in `view.config.kanban_collapsed_columns`.
- "+ Add card" button at bottom.

**Card:**
- Primary field value as card title.
- Configurable secondary fields shown below title (from `view.config.gallery_card_fields` — reuses same config key).
- Click card: open row editor.
- Drag card: `@dnd-kit/core` drag-and-drop. Dragging between columns updates the `select` field value on the row. Dragging within column updates `sort_order`.

**Group-by field selector:**
In view options popover: select which `select` field to group by. If no select field exists: show empty state with "Add a Select field to use Kanban view."

**"No status" column:**
Rows where the group-by field is null appear in a "No [field name]" column on the left.

### 13.3 Calendar View

Displays rows as events on a calendar. Requires a `date` or `datetime` field to map rows to dates.

**Configuration (view options):**
- Date field selector: which field to use for placing rows on the calendar.
- Display mode: month / week / day (toggle buttons).

**Month view:**
- 7-column grid (Mon–Sun).
- Each day cell shows: date number, event pills (up to 3 visible, "+ N more" if overflow).
- Event pill: primary field value, truncated.
- Click event: open row editor.
- Click empty day: opens quick-create row with that date pre-filled.
- Drag event to different day: updates date field value.
- Today's date highlighted.
- Days outside current month: dimmed.

**Week view:**
- Hourly time grid. Rows with `datetime` field show as positioned blocks.
- Rows with `date` field show as all-day events at the top.

**Day view:**
- Single day, hourly grid. Same as week but one day wide.

### 13.4 Gallery View

Grid of cards. Good for visual data (books, movies, products with images).

**Configuration:**
- Cover field: select a `file` field to use the first image as the card cover.
- Card fields: select which fields to show on each card face.
- Card size: small (3 per row) / medium (4 per row) / large (2 per row).

**Card:**
- Cover image (if configured and file is an image) — fills top portion of card.
- Primary field value as bold title.
- Selected card fields shown as label-value pairs.
- Click card: open row editor.

### 13.5 List View

Minimal, dense, single-column list. Good for task-list-style collections.

- Each row: checkbox (for boolean fields) + primary field value + secondary field value (configurable).
- Clicking the row: opens row editor.
- Fast to scan, low visual noise.
- Sorted by view sort config.

### 13.6 Filters

Filters are per-view, stored in `view.config.filters`.

**Filter UI:**
- "Filter" button in Collection header. Badge shows count of active filters.
- Click opens a Radix Popover showing the filter builder.
- "+ Add filter" button adds a new `FilterRule`.
- Each rule row: [field selector] [operator selector] [value input] [delete button]
- All rules are AND'd together.
- "Clear all" button.

**Operators per field type:**

| Field Type | Available Operators |
|------------|-------------------|
| text, rich_text | contains, does not contain, is, is not, is empty, is not empty, starts with, ends with |
| number | =, ≠, >, <, ≥, ≤, is empty, is not empty |
| date, datetime | is, is before, is after, is on or before, is on or after, is empty, is not empty |
| boolean | is true, is false |
| select | is, is not, is empty, is not empty |
| multi_select | contains, does not contain, is empty, is not empty |
| url, email, phone | contains, is empty, is not empty |
| relation | is linked to, is not linked to, has any, is empty |

**Filter application:**
Filters are applied in the TanStack Query `select` function or in a Supabase `.filter()` chain depending on whether we can push the filter to the database (for simple operators on JSONB fields, yes; for complex operators on nested data, client-side).

### 13.7 Sorts

Sorts are per-view, stored in `view.config.sorts`.

- Multiple sorts with priority order (first sort is primary, etc.).
- Each sort: field + direction (asc/desc).
- Sort UI: popover, drag to reorder, delete individual sort.
- Applied via Supabase `.order()` or client-side sorting.

For JSONB data sorting: use Postgres `data->>'field_slug'` expression for text sorts, `(data->>'field_slug')::numeric` for numeric sorts, `(data->>'field_slug')::date` for date sorts.

---

## 14. Relations System

### 14.1 Defining a Relation
A Relation is a Field of type `relation` on a Collection. When adding the field:
- Select target Collection (dropdown of all user's collections).
- Select display: `single` (one relation per row) or `multiple` (many relations per row).

### 14.2 Storing Relations
Relations are NOT stored in `rows.data`. They are stored in `row_relations`:
```
{ source_row_id, target_row_id, field_id }
```
A row with multiple relations has multiple rows in `row_relations` with the same `source_row_id` and `field_id`.

When fetching rows with relations: a separate query fetches `row_relations` for the collection's relation fields and joins in the target rows' primary field values.

### 14.3 Relation Picker
In the row editor, a relation field shows:
- Pills for each currently linked row (showing target row's primary field value).
- "Link [Collection]" button (or click pill area).
- Opens a Radix Popover with:
  - Search input (searches target collection by primary field)
  - List of matching rows
  - Click a row to link it (adds `row_relations` entry)
  - Already-linked rows shown with a checkmark
  - Click linked row in list to unlink (removes `row_relations` entry)

### 14.4 Reverse Relations
In the row editor, after all fields, a "Referenced by" section shows all rows from other Collections that have a `relation` field pointing to this row. Grouped by Collection. Each entry: Collection icon + Collection name + Row primary field value. Clicking opens that row.

### 14.5 Relation Cells in Table View
A `relation` cell shows pills (compact, small). Overflow: "·· N more". Clicking a pill opens that related row's editor. Right-click pill: "Remove link".

---

## 15. Dashboard System

### 15.1 Dashboard Layout
The Dashboard is the default home route (`/dashboard`). It uses a CSS Grid with 12 columns and auto-height rows. Widgets snap to the grid.

Widget grid config:
- Grid: 12 columns, 80px row height, 16px gap.
- Widgets: minimum 2 columns wide, 2 rows tall. Maximum 12 columns wide, 6 rows tall.
- Widget position and size stored in `dashboard_widgets.position_x`, `.position_y`, `.width`, `.height`.

### 15.2 Widget Types

#### `collection_stats`
Shows:
- Collection icon + name
- Total row count (large number)
- "Added today: N" / "Updated today: N"
- "Last updated: [relative time]"
Config: `{ collection_id: string }`

#### `recent_rows`
Shows the last N rows from a Collection in a compact list.
Each row shows: primary field value + one secondary field value + created at.
Click row: opens row editor.
Config: `{ collection_id, limit: 5|10, show_fields: string[] }`

#### `view_embed`
Renders a full saved View inline in the widget. Behaves exactly like the full view but smaller. No filters/sort UI visible — uses the View's saved config.
Config: `{ collection_id, view_id }`

#### `live_source_status`
Shows the sync status for a Live Source Collection.
- Collection name + icon
- Last synced: [relative time]
- Status badge: green/yellow/red
- Row count
- "Sync now" button
Config: `{ collection_id }`

#### `quick_add`
A small form widget that lets you add a row to a Collection without navigating to it.
Shows: Collection name + primary field input + optional secondary fields + Add button.
On submit: creates row, shows success toast.
Config: `{ collection_id, prefill: Record<string, any> }`

### 15.3 Adding / Editing / Removing Widgets
- "+ Add widget" button (top right of dashboard, or Cmd+K → "Add widget")
- Opens a modal: select widget type → select collection → configure → save
- Resize: drag bottom-right corner of widget (drag handle appears on hover)
- Move: drag widget header
- Remove: hover widget → X button appears top-right → click → confirm

### 15.4 Empty Dashboard
Fresh account: "Build your dashboard" empty state with + icon and instructions. First-time users shown a subtle guide: "Add your first Collection to get started →"

---

## 16. Command Palette System

### 16.1 Library & Setup
Built on `cmdk`. Rendered as a Radix Dialog containing the `<Command>` component. The Dialog is managed in Zustand (`appStore.paletteOpen`). Global keydown listener in the AppShell component handles Cmd+K.

### 16.2 Schema-Aware Commands
On palette open, commands are dynamically generated from:
- Current user's Collections (from TanStack Query cache or fresh fetch)
- Fields of the currently active Collection
- Views of the currently active Collection
- Current route context (what's the user currently looking at?)

This means if you're inside your "Books" Collection, typing "filter" shows "Filter by Author", "Filter by Status", "Filter by Rating" — not just a generic "Filter" command.

### 16.3 Command Groups & All Commands

**Navigation**
- Go to Dashboard
- Go to Settings
- Go to [Collection Name] (one entry per collection)
- Go to [View Name] in [Collection Name]
- Toggle sidebar

**Collections**
- Create new collection
- Edit [current/named collection]
- Rename [collection]
- Change icon for [collection]
- Delete [collection]
- Duplicate [collection]
- Export [collection] as CSV

**Rows**
- Add row to [Collection Name] (one per collection)
- Search in [Collection Name]
- Open last created row

**Views**
- Add table view to [collection]
- Add kanban view to [collection]
- Add calendar view to [collection]
- Add gallery view to [collection]
- Add list view to [collection]
- New custom view for [collection]
- Rename current view
- Delete current view

**Filters & Sorts** (shown when inside a Collection)
- Add filter
- Clear all filters
- Add sort
- Clear all sorts
- Filter by [Field Name] (one per field in active collection)
- Sort by [Field Name] ascending
- Sort by [Field Name] descending

**Fields** (shown when inside a Collection)
- Add field to [Collection]
- Hide/show [Field Name]
- Edit [Field Name]

**Live Sources**
- Connect live source to [collection]
- Sync [collection] now (for live source collections)
- Disconnect [collection] live source

**Dashboard**
- Add widget to dashboard
- Go to dashboard

**Settings & MCP**
- Open settings
- Copy MCP server URL
- View keyboard shortcuts

### 16.4 Search Behavior
cmdk provides built-in fuzzy search over command labels. The `value` prop on each `<CommandItem>` includes aliases (e.g., the "Create new collection" item has value "create new collection add database table") for better search recall.

### 16.5 Keyboard Navigation
All keyboard, always:
- `Cmd+K` — open palette
- `Escape` — close palette  
- `↑` / `↓` — navigate items
- `Enter` — execute selected item
- The search input is focused automatically on palette open

---

## 17. Live Sources System

### 17.1 Architecture Overview

Each Live Source is implemented as a Supabase Edge Function. The sync flow:
1. Fetch from external API using stored credentials
2. Map API response to Kern field types
3. Upsert into `rows` table using `external_id` to avoid duplicates
4. Update `collections.last_synced_at` and `sync_status`
5. Supabase Realtime fires → TanStack Query cache invalidated → UI updates

Sync triggers:
- **Manual:** User clicks "Sync now" (calls Edge Function via supabase-js `functions.invoke`)
- **Webhook:** External service POSTs to `/functions/v1/kern-webhook-[source]` (registered during OAuth setup)
- **Cron:** `pg_cron` scheduled job, configurable per source

### 17.2 OAuth Token Storage
OAuth tokens stored in `collections.live_source_config` JSONB, encrypted at rest using Supabase Vault (or AES-256 encryption with `ENCRYPTION_KEY` env var in the Edge Function).

`live_source_config` shape per source:

```jsonc
// GitHub
{
  "access_token": "encrypted_string",
  "refresh_token": "encrypted_string",
  "scope": "repo,user",
  "source_subtype": "prs",    // 'prs' | 'issues' | 'repos'
  "repo_filter": "owner/repo" // optional — filter to specific repo
}

// Google Calendar
{
  "access_token": "encrypted_string",
  "refresh_token": "encrypted_string",
  "calendar_id": "primary",
  "watch_channel_id": "uuid",  // for push notifications
  "watch_expiry": "ISO8601"
}

// Notion
{
  "access_token": "encrypted_string",
  "database_id": "notion_database_id",
  "workspace_name": "string"
}

// Linear
{
  "access_token": "encrypted_string",
  "team_id": "string",        // optional filter
  "source_subtype": "issues"  // 'issues' | 'projects'
}

// RSS
{
  "feed_url": "https://...",
  "feed_title": "string"
}

// Akiflow
{
  "api_key": "encrypted_string"
}
```

### 17.3 GitHub Live Source

**Auth:** GitHub OAuth App. Scopes: `repo` (for private repos), `read:user`.

**Source subtypes and their Fields:**

*GitHub PRs* → default fields created:
| Field | Type | Description |
|-------|------|-------------|
| title | text (primary) | PR title |
| status | select | open / closed / merged |
| repo | text | owner/repo string |
| branch | text | head branch name |
| author | text | GitHub login |
| url | url | HTML URL |
| number | number | PR number |
| created_at | datetime | PR created date |
| merged_at | datetime | Merge date |
| labels | multi_select | PR labels |

*GitHub Issues* → similar fields, with `assignee` and `milestone` instead of branch/merged_at.

*GitHub Repos* → name, url, language, stars, forks, last_pushed_at, visibility, description.

**external_id:** GitHub PR/issue node ID (globally unique across GitHub).

**Sync:** GitHub webhooks (events: `pull_request`, `issues`) + 15-minute cron fallback.

### 17.4 Google Calendar Live Source

**Auth:** Google OAuth 2.0. Scopes: `https://www.googleapis.com/auth/calendar.readonly`.

*Calendar Events* → default fields:
| Field | Type |
|-------|------|
| title | text (primary) |
| start_datetime | datetime |
| end_datetime | datetime |
| calendar_name | text |
| description | rich_text |
| location | text |
| status | select (confirmed / tentative / cancelled) |
| all_day | boolean |

**external_id:** Google Calendar event ID.

**Sync:** Google Calendar Push Notifications (webhook when events change) + hourly cron fallback. Push notification channel expires every 7 days — cron job renews it.

### 17.5 Notion Live Source

**Auth:** Notion OAuth. User selects which database to sync.

Fields are dynamically created to match the Notion database schema, with type mapping:

| Notion Type | Kern Type |
|------------|-----------|
| title | text (primary) |
| rich_text | rich_text |
| number | number |
| select | select |
| multi_select | multi_select |
| date | date or datetime |
| checkbox | boolean |
| url | url |
| email | email |
| phone_number | phone |
| people | text |
| files | file |

**external_id:** Notion page ID.

**Sync:** 15-minute cron (Notion API doesn't support webhooks for database changes).

### 17.6 Linear Live Source

**Auth:** Linear OAuth.

*Linear Issues* → default fields:
| Field | Type |
|-------|------|
| title | text (primary) |
| status | select |
| priority | select (no priority / urgent / high / medium / low) |
| assignee | text |
| team | text |
| labels | multi_select |
| due_date | date |
| url | url |
| created_at | datetime |

**external_id:** Linear issue ID.

**Sync:** Linear webhooks (issues and projects) + 15-minute cron fallback.

### 17.7 RSS / Atom Feeds

**Auth:** None (public feeds) or Basic Auth (stored in `live_source_config`).

Fields created:
| Field | Type |
|-------|------|
| title | text (primary) |
| url | url |
| published_at | datetime |
| summary | rich_text |
| author | text |
| feed_name | text |

**external_id:** Item GUID / link URL.

**Sync:** 30-minute cron.

### 17.8 Akiflow Live Source

**Auth:** Akiflow API key (user pastes in, no OAuth flow).

Fields: title (primary), status, scheduled_date, due_date, priority, labels.

**Sync:** 15-minute cron.

### 17.9 Apple Calendar (CalDAV)

**Auth:** iCloud app-specific password + Apple ID. Stored encrypted.

Fields: same as Google Calendar events.

**Sync:** 30-minute cron via CalDAV protocol (no webhook support).

### 17.10 Live Source UI Flow

1. User: Collection ⋯ menu → "Connect live source" (or Cmd+K → "Connect live source to [collection]")
2. Modal opens: "Select data source" — grid of source options with icons
3. User selects source
4. For OAuth sources: redirect to provider OAuth page
5. For API key sources: input field
6. On auth complete: Edge Function called to store credentials + trigger initial sync
7. Modal shows sync progress
8. On complete: modal closes, collection shows synced rows, Live Source badge in header

**Live Source Badge (in Collection header when is_live_source = true):**
- Idle: "⟳ Synced [relative time]" in gray
- Syncing: "⟳ Syncing..." with spinner in amber
- Error: "⚠ Sync failed" in red (hover shows error message)
- Click: opens sync settings popover (sync now, configure, disconnect)

---

## 18. Views as Code System

### 18.1 Overview
Views as Code is the power feature that separates Kern from all competitors. A user who knows React can write a component that renders their Collection data in any way imaginable. The app provides the editor, the runtime, and the API. The user provides the creativity.

### 18.2 The KernViewProps Interface
Every custom view receives exactly these props:

```typescript
interface KernViewProps {
  // The rows in the collection, with current view's filters/sorts applied
  rows: KernRow[];
  // The fields defined on the collection
  fields: KernField[];
  // Collection name string
  collectionName: string;
  // Async function to update a row's data
  onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>;
  // Async function to create a new row
  onRowCreate: (data: Record<string, unknown>) => Promise<void>;
  // Async function to delete a row
  onRowDelete: (rowId: string) => Promise<void>;
  // Open the row editor panel for a given row
  onRowClick: (rowId: string) => void;
}
```

### 18.3 Available APIs inside Custom Views
The sandboxed iframe has access to:
- **React** (all hooks: useState, useEffect, useMemo, useCallback, useRef, useReducer)
- **Recharts** (BarChart, LineChart, PieChart, AreaChart, RadarChart, and all subcomponents)
- **date-fns** (format, parse, differenceInDays, addDays, startOfWeek, startOfMonth, etc.)
- **Tailwind CSS** (via CDN in sandbox — full utility class access)
- **Lucide React** (all icons)

Custom views CANNOT:
- Import external npm packages not listed above
- Make fetch() calls to external URLs
- Access localStorage or sessionStorage
- Access the parent window (strict iframe sandbox)

### 18.4 Custom View Examples

**Example 1: GitHub contribution-style heatmap for habit tracking**
```jsx
export default function HabitHeatmap({ rows, fields }) {
  const dateField = fields.find(f => f.slug === 'date' && f.type === 'date');
  if (!dateField) return <div className="p-4 text-gray-500">Add a 'date' field to use this view.</div>;

  const today = new Date();
  const weeks = 26; // 6 months
  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks * 7 - 1 - i));
    return d;
  });

  const dateSet = new Set(rows.map(r => r.data[dateField.slug]).filter(Boolean));

  return (
    <div className="p-6">
      <h2 className="text-sm font-medium text-gray-700 mb-4">Activity — last 6 months</h2>
      <div className="flex gap-1">
        {Array.from({ length: weeks }, (_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, d) => {
              const day = days[w * 7 + d];
              const dateStr = day.toISOString().split('T')[0];
              const active = dateSet.has(dateStr);
              return (
                <div
                  key={d}
                  title={dateStr}
                  className={`w-3 h-3 rounded-sm ${active ? 'bg-indigo-500' : 'bg-gray-100'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Example 2: Expense breakdown pie chart (uses Recharts)**
```jsx
export default function ExpenseChart({ rows, fields }) {
  const { PieChart, Pie, Cell, Tooltip, Legend } = Recharts;
  const amountField = fields.find(f => f.slug === 'amount');
  const categoryField = fields.find(f => f.type === 'select' && f.slug === 'category');
  if (!amountField || !categoryField) return <div className="p-4">Add 'amount' and 'category' fields.</div>;

  const totals = rows.reduce((acc, row) => {
    const cat = row.data[categoryField.slug];
    const amt = Number(row.data[amountField.slug] || 0);
    acc[cat] = (acc[cat] || 0) + amt;
    return acc;
  }, {});

  const data = Object.entries(totals).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="p-4 flex flex-col items-center">
      <PieChart width={320} height={280}>
        <Pie data={data} cx={160} cy={120} outerRadius={100} dataKey="value" label>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
        <Legend />
      </PieChart>
    </div>
  );
}
```

### 18.5 Code Editor (Monaco)
Accessed via: Collection → Views tab → "+ Add view" → "Custom view" → "Open editor"

The editor page (`/c/:slug/views/custom/new` or `/c/:slug/views/custom/:viewId/edit`):
- Left 60%: Monaco editor, TypeScript mode, word-wrap enabled, Kern type defs injected.
- Right 40%: Live preview iframe (re-renders on save or Cmd+S).
- Top bar: view name input, Save button, Close (back to collection) button.
- Bottom status bar: compilation status, error count.

Monaco configuration:
```typescript
{
  language: 'typescript',
  theme: 'vs-dark', // or 'vs' for light mode
  fontSize: 13,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  tabSize: 2,
}
```

TypeScript definitions injected via `monaco.languages.typescript.typescriptDefaults.addExtraLib()` — the full `KernViewProps` and related types are available for IntelliSense.

### 18.6 Sandboxed Execution

```
User code → Babel transform (browser) → postMessage to iframe
                                      ← props (rows, fields, callbacks)
                                      → render output
                                      ← onRowUpdate / onRowCreate / onRowDelete calls
                                         (proxied back to the parent via postMessage)
```

Iframe `sandbox` attribute: `allow-scripts` (no `allow-same-origin` — strict isolation).

Compilation errors are caught and displayed inline in the Monaco editor as error markers and in a collapsible panel at the bottom of the editor.

### 18.7 View Registration & Management
- Saved views appear in the Collection's view tabs alongside built-in views.
- Custom view is identified in the tab with a `</>` icon.
- A custom view can be assigned to multiple Collections (they all get the same code but different data).
- "My custom views" page in Settings: list of all custom views, with Edit / Delete / Assign to collections / Export as JSON options.
- Export: downloads `{ name, description, code }` as a `.kern-view.json` file.
- Import: drag-drop or file picker for `.kern-view.json` files.

---

## 19. MCP Server Specification

### 19.1 Endpoint & Auth
```
POST https://<project-ref>.supabase.co/functions/v1/kern-mcp
Authorization: Bearer <user_jwt>
Content-Type: application/json
```

The JWT is the user's Supabase auth token. The Edge Function validates it, extracts `auth.uid()`, and scopes all database operations to that user. The MCP server URL (with instructions) is shown in Settings → Integrations → Claude MCP.

### 19.2 MCP Protocol
The server implements the MCP protocol spec (JSON-RPC 2.0 over HTTP). Two request types:
- `tools/list` — returns the list of available tools
- `tools/call` — executes a tool

### 19.3 Complete Tool Definitions

#### `list_collections`
```json
{
  "name": "list_collections",
  "description": "List all collections in the user's Kern workspace. Returns collection names, slugs, field schemas, row counts, and whether the collection is a live source.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```
Returns: Array of collection objects with their fields.

#### `query_rows`
```json
{
  "name": "query_rows",
  "description": "Query rows from a Kern collection. Supports filtering by field values and sorting. Returns row data with field values.",
  "inputSchema": {
    "type": "object",
    "required": ["collection_slug"],
    "properties": {
      "collection_slug": {
        "type": "string",
        "description": "The slug of the collection to query"
      },
      "filters": {
        "type": "array",
        "description": "Optional array of filter conditions (all AND'd together)",
        "items": {
          "type": "object",
          "required": ["field", "operator", "value"],
          "properties": {
            "field": { "type": "string", "description": "Field slug" },
            "operator": { "type": "string", "enum": ["eq","neq","gt","lt","contains","is_empty","is_not_empty"] },
            "value": { "description": "Value to compare against" }
          }
        }
      },
      "sort": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "direction": { "type": "string", "enum": ["asc", "desc"] }
        }
      },
      "limit": { "type": "number", "default": 50, "maximum": 200 },
      "offset": { "type": "number", "default": 0 }
    }
  }
}
```

#### `get_row`
```json
{
  "name": "get_row",
  "description": "Get a single row by its ID, including all field values and related rows.",
  "inputSchema": {
    "type": "object",
    "required": ["row_id"],
    "properties": {
      "row_id": { "type": "string", "description": "UUID of the row" }
    }
  }
}
```

#### `create_row`
```json
{
  "name": "create_row",
  "description": "Create a new row in a Kern collection with the specified field values.",
  "inputSchema": {
    "type": "object",
    "required": ["collection_slug", "data"],
    "properties": {
      "collection_slug": { "type": "string" },
      "data": {
        "type": "object",
        "description": "Key-value pairs where keys are field slugs and values are field values. Use field slugs (snake_case) not display names."
      }
    }
  }
}
```

#### `update_row`
```json
{
  "name": "update_row",
  "description": "Update one or more field values on an existing row.",
  "inputSchema": {
    "type": "object",
    "required": ["row_id", "data"],
    "properties": {
      "row_id": { "type": "string" },
      "data": {
        "type": "object",
        "description": "Field slug → new value pairs. Only specified fields are updated."
      }
    }
  }
}
```

#### `delete_row`
```json
{
  "name": "delete_row",
  "description": "Permanently delete a row by its ID.",
  "inputSchema": {
    "type": "object",
    "required": ["row_id"],
    "properties": {
      "row_id": { "type": "string" }
    }
  }
}
```

#### `create_collection`
```json
{
  "name": "create_collection",
  "description": "Create a new collection with a name, optional description, and optional initial fields.",
  "inputSchema": {
    "type": "object",
    "required": ["name"],
    "properties": {
      "name": { "type": "string" },
      "description": { "type": "string" },
      "icon": { "type": "string", "description": "An emoji character" },
      "fields": {
        "type": "array",
        "description": "Optional fields to create alongside the collection",
        "items": {
          "type": "object",
          "required": ["name", "type"],
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string", "enum": ["text","number","date","datetime","boolean","select","multi_select","url","email","rich_text"] },
            "options": { "type": "object" }
          }
        }
      }
    }
  }
}
```

#### `add_field`
```json
{
  "name": "add_field",
  "description": "Add a new field to an existing collection.",
  "inputSchema": {
    "type": "object",
    "required": ["collection_slug", "field_name", "field_type"],
    "properties": {
      "collection_slug": { "type": "string" },
      "field_name": { "type": "string" },
      "field_type": { "type": "string", "enum": ["text","number","date","datetime","boolean","select","multi_select","url","email","phone","rich_text"] },
      "options": { "type": "object", "description": "Type-specific options (e.g., items array for select fields)" }
    }
  }
}
```

#### `search_rows`
```json
{
  "name": "search_rows",
  "description": "Full-text search across all collections or within a specific collection.",
  "inputSchema": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": { "type": "string", "description": "Search string" },
      "collection_slug": { "type": "string", "description": "Optional: limit to one collection" },
      "limit": { "type": "number", "default": 20 }
    }
  }
}
```

### 19.4 Example Claude ↔ Kern conversations via MCP

```
User to Claude: "Add a book called The Pragmatic Programmer by Andy Hunt to my Books 
collection with status to-read"

Claude → create_row({ collection_slug: "books", data: { title: "The Pragmatic Programmer", 
  author: "Andy Hunt", status: "to_read" } })

Claude: "Added 'The Pragmatic Programmer' by Andy Hunt to your Books collection with 
status 'to-read'."

---

User: "How many workouts did I log this month?"
Claude → query_rows({ collection_slug: "workouts", filters: [{ field: "date", 
  operator: "gte", value: "2026-03-01" }] })
Claude: "You've logged 14 workouts so far in March."

---

User: "Create a collection for interview prep with fields: Company, Role, Date, Status 
(select: Applied/Screening/Interview/Offer/Rejected), and Notes"
Claude → create_collection({ name: "Interview Prep", fields: [...] })
Claude: "Created 'Interview Prep' collection with 5 fields including a Status selector 
with all the stages."

---

User: "Mark my 7am workout today as done"
Claude → query_rows({ collection_slug: "workouts", filters: [{ field: "date", operator: "eq", 
  value: "2026-03-22" }, { field: "time", operator: "eq", value: "07:00" }] })
Claude → update_row({ row_id: "...", data: { status: "done" } })
Claude: "Marked your 7am workout today as done."
```

### 19.5 Settings UI for MCP
Settings → Integrations → Claude MCP section:
- MCP Server URL (displayed, copyable)
- "How to connect" instructions (3 steps with screenshots)
- Authentication token generator (generates a non-expiring token for use with Claude MCP)
- "Test connection" button (calls MCP server's `list_collections` and shows result)

---

## 20. UI/UX Design Specification

### 20.1 Design Language
Kern's visual language is the aesthetic of developer tools: calm, monochromatic, information-dense, precise. Inspired by Linear, Raycast, and VS Code. Anti-inspiration: Notion (too content-focused), Coda (too heavy), Airtable (too colorful). The app should look like it was built by an engineer for engineers, not designed by a marketing team.

### 20.2 Color System

```typescript
// Tailwind config extension (tailwind.config.ts)
{
  colors: {
    // Background layers
    'kern-bg':        '#ffffff',   // dark: #0a0a0a
    'kern-surface':   '#f9f9f8',   // dark: #111110
    'kern-surface-2': '#f2f2f0',   // dark: #1a1a19
    
    // Borders
    'kern-border':    '#e8e8e6',   // dark: #242423
    'kern-border-2':  '#d4d4d1',   // dark: #333330
    
    // Text
    'kern-text':      '#1a1a19',   // dark: #ededec
    'kern-text-2':    '#6f6e6a',   // dark: #7c7b77
    'kern-text-3':    '#a19f99',   // dark: #57554f
    
    // Interactive
    'kern-accent':    '#5b5bd6',   // Indigo — primary interactive color
    'kern-accent-2':  '#e8e8f8',   // Accent bg hover
    
    // Status
    'kern-danger':    '#e5484d',
    'kern-success':   '#30a46c',
    'kern-warning':   '#f59e0b',
    
    // Select option colors (12 preset options)
    'opt-red':        '#f87171',
    'opt-orange':     '#fb923c',
    'opt-amber':      '#fbbf24',
    'opt-yellow':     '#facc15',
    'opt-lime':       '#a3e635',
    'opt-green':      '#4ade80',
    'opt-teal':       '#2dd4bf',
    'opt-cyan':       '#22d3ee',
    'opt-blue':       '#60a5fa',
    'opt-indigo':     '#818cf8',
    'opt-purple':     '#c084fc',
    'opt-pink':       '#f472b6',
  }
}
```

### 20.3 Typography

```css
/* Base */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
font-size: 14px;
line-height: 1.5;
font-weight: 400;

/* Hierarchy */
h1: 20px, weight 600
h2: 16px, weight 600  
h3: 14px, weight 500
body: 14px, weight 400
small: 12px, weight 400
tiny: 11px, weight 400

/* Monospace (for field slugs, MCP URLs, code snippets) */
font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### 20.4 Spacing & Layout

- **Grid:** 8px base unit. All spacing values are multiples of 4px or 8px.
- **Page padding:** 24px (desktop), 16px (compact)
- **Sidebar width:** 240px expanded, 48px collapsed (icon only)
- **Topbar height:** 48px
- **Row editor panel width:** 480px
- **Modal max-width:** 520px (standard), 720px (wide, for custom view editor)
- **Table row height:** 36px (compact) / 52px (comfortable)
- **Border radius:** 4px (cells, chips), 6px (inputs, buttons), 8px (modals, cards), 12px (panels)

### 20.5 Component Specifications

#### Button
```
Variants: primary (accent bg), secondary (surface bg + border), ghost (no bg, no border), danger (red)
Sizes: sm (28px height, 12px font), md (32px height, 14px font), lg (36px height, 14px font)
States: default, hover (slightly darker), active (slightly darker still), disabled (opacity 40%), loading (spinner replaces content)
```

#### Input
```
Height: 32px (default), 28px (compact)
Border: 1px kern-border
Border-radius: 6px
Focus: 2px kern-accent ring
Placeholder: kern-text-3 color
Padding: 8px 12px
```

#### Modal (Radix Dialog)
```
Overlay: black/50 backdrop, blur-sm
Container: white bg, rounded-lg (12px), shadow-xl
Header: 20px padding, bold title, optional close button
Body: 20px padding
Footer: 16px padding, flex row right-aligned, Cancel + Confirm buttons
Max-width: 520px. Centered vertically and horizontally.
Animation: fade-in + scale-up from 95%, 150ms ease-out
```

#### Select Pill (for select/multi_select cells)
```
Height: 20px
Padding: 0 8px
Border-radius: 4px
Background: option color at 15% opacity
Text: option color (full)
Font-size: 12px
Font-weight: 500
```

#### Tooltip (Radix Tooltip)
```
Background: kern-text (dark bg regardless of app theme)
Text: white
Font-size: 12px
Padding: 4px 8px
Border-radius: 4px
Delay: 400ms show, 0ms hide
Max-width: 240px
```

### 20.6 Animation & Transitions

Keep animations functional, not decorative. Every animation must serve a purpose (show hierarchy, indicate state change, provide spatial context).

- **Sidebar collapse/expand:** 200ms ease-in-out, width transition
- **Modal open/close:** 150ms ease-out, fade + scale
- **Row editor panel:** 200ms ease-out, slide from right
- **Toast:** 300ms ease-out, slide from bottom-right
- **Dropdown/Popover:** 150ms ease-out, fade
- **Skeleton loading:** 1.5s ease-in-out infinite pulse
- **No:** bounce, spring exaggerated, confetti, or any animation > 400ms

### 20.7 Loading States

**Skeleton loading** (not spinners) for all initial data loads. Skeleton components match the shape of the content they replace:
- Sidebar: skeleton lines for each collection entry
- Table view: skeleton rows (random-width gray bars for each cell)
- Row editor: skeleton lines for each field
- Dashboard: skeleton blocks for each widget

**Optimistic updates** for all mutations. The UI updates immediately; the spinner never blocks user interaction. If the server call fails, a toast shows the error and the data reverts.

### 20.8 Empty States

Every empty state has:
1. A Lucide icon (60px, kern-text-3 color)
2. A title (e.g., "No rows yet")
3. A subtitle (e.g., "Click + Add row or press Cmd+K to get started")
4. An action button (primary)

Empty state scenarios:
- Empty collection: "No rows yet" → "+ Add row" button
- Empty collection after filter: "No rows match your filters" → "Clear filters" button
- Empty Kanban column: "+ Add card" text (subtle, no full empty state)
- Empty Dashboard: "Build your dashboard" → "+ Add widget" button
- Empty sidebar (no collections): "Create your first collection" → "New collection" button
- No search results: "No results for '[query]'" (no action button)

### 20.9 Responsive Design

Kern is desktop-first with a minimum supported viewport width of 1024px. Below 1024px, a "Kern is best experienced on desktop" banner appears and the sidebar becomes a sheet (slide-in from left, triggered by a hamburger button in the topbar). No redesign for mobile — just graceful degradation.

---

## 21. Component Architecture

### 21.1 Component Organization

All components in `src/components/`. Organized by domain, not by type.

```
src/components/
├── auth/           # Login form, signup form, protected route
├── collection/     # Collection CRUD modals, header, icon
├── command/        # Command palette, command items
├── cells/          # One component per field type (table cell renderer)
├── dashboard/      # Dashboard, widgets
├── field/          # Add/edit field panel, field type selector
├── layout/         # AppShell, Sidebar, Topbar
├── live-sources/   # Connect modal, badges, per-source config components
├── row/            # Row editor, row context menu, relation picker
├── ui/             # Generic primitives (Button, Input, Modal, etc.)
└── views/          # View tabs, all view renderers, filters, sorts
```

### 21.2 Key Component Details

#### `AppShell` (`src/components/layout/AppShell.tsx`)
The root layout component. Renders: Topbar + Sidebar + main content area + CommandPalette (always in DOM) + RowEditorPanel (conditionally in DOM) + Toast provider. Handles global keyboard shortcuts (Cmd+K for palette, Cmd+\ for sidebar).

#### `Sidebar` (`src/components/layout/Sidebar.tsx`)
Uses `useCollections` hook. Renders collection list with drag-and-drop (dnd-kit). Handles collection hover state, active state, and the ⋯ action menu. Subscribe to Zustand `appStore` for collapsed state.

#### `CollectionPage` (`src/pages/CollectionPage.tsx`)
Route: `/c/:slug`. Fetches collection by slug. Renders CollectionHeader + active View based on the active view tab selection. Manages the active view state locally (also persisted in URL: `/c/:slug?view=:viewId`).

#### `TableView` (`src/components/views/TableView/TableView.tsx`)
Uses TanStack Table. Takes `rows`, `fields`, `viewConfig` as props. All mutations go via `useRows` hooks (update, delete). Virtual rows via TanStack Virtual when row count > 200.

#### `CommandPalette` (`src/components/command/CommandPalette.tsx`)
Always mounted. Shown/hidden via Radix Dialog controlled by Zustand. On open: fetches fresh collections list (or uses cache). Dynamically builds command list from schema-aware context. Uses `cmdk` for the fuzzy-search list.

#### `RowEditorPanel` (`src/components/row/RowEditor.tsx`)
Slides in from the right. Receives `rowId` and `collectionId` from Zustand `appStore.openRowId`. Fetches full row + fields + relations. Renders each field with its appropriate editor component. All saves are optimistic via `useRows` mutation.

### 21.3 Cell Components

Each cell component receives:
```typescript
interface CellProps {
  value: unknown;
  field: KernField;
  rowId: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (newValue: unknown) => void;
  onCancel: () => void;
}
```

Cell components:
- `TextCell` — contenteditable div or input
- `NumberCell` — number input, right-aligned
- `DateCell` — date display + Radix Popover with calendar
- `DateTimeCell` — date+time display + Popover
- `BooleanCell` — Radix Checkbox (directly toggleable, no separate edit mode)
- `SelectCell` — pill display + Radix Popover dropdown
- `MultiSelectCell` — pills + Radix Popover multi-dropdown
- `UrlCell` — link display + input in edit mode
- `RelationCell` — pills with linked row names
- `FileCell` — file count badge, popover with file list

---

## 22. State Management Architecture

### 22.1 Zustand (`appStore`)

Location: `src/stores/appStore.ts`

```typescript
interface AppStore {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Command Palette
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;

  // Row Editor
  openRowId: string | null;
  openRowCollectionId: string | null;
  openRow: (rowId: string, collectionId: string) => void;
  closeRow: () => void;

  // Active Collection context (for schema-aware commands)
  activeCollectionSlug: string | null;
  setActiveCollection: (slug: string | null) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}
```

Persisted to localStorage (via Zustand `persist` middleware): `sidebarCollapsed`, `theme`.

### 22.2 TanStack Query

All server data lives in TanStack Query cache. Query key hierarchy:
```
['collections', userId]                           → all user's collections
['collection', collectionSlug, userId]            → single collection by slug
['fields', collectionId]                          → all fields for a collection
['rows', collectionId, viewConfig]                → rows with filter/sort applied
['row', rowId]                                    → single row full data
['relations', rowId]                              → relations for a row
['views', collectionId]                           → views for a collection
['widgets', userId]                               → dashboard widgets
['custom_views', userId]                          → custom view registry
```

`staleTime`: 60s for collections/fields/views (rarely change). 10s for rows (frequently change). 0s for single row (always fresh when opening editor).

Mutation side effects: every mutation calls `queryClient.invalidateQueries()` on the relevant query keys. Related keys also invalidated (e.g., creating a row invalidates `['rows', collectionId, ...]` and `['collections', userId]` to update row count).

---

## 23. Data Fetching & Caching Strategy

### 23.1 Supabase Query Patterns

```typescript
// Rows with filter/sort applied at database level
const fetchRows = async (collectionId: string, viewConfig: ViewConfig) => {
  let query = supabase
    .from('rows')
    .select('*')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  // Apply sorts
  for (const sort of viewConfig.sorts) {
    query = query.order(
      `data->>'${sort.field_slug}'`,
      { ascending: sort.direction === 'asc' }
    );
  }

  // Apply simple filters (push to DB)
  for (const filter of viewConfig.filters) {
    if (filter.operator === 'eq') {
      query = query.eq(`data->>'${filter.field_slug}'`, filter.value);
    }
    // ... more operators
  }

  return query.throwOnError();
};
```

### 23.2 Optimistic Updates Pattern

```typescript
// Example: optimistic row update
const updateRowMutation = useMutation({
  mutationFn: ({ rowId, data }) =>
    supabase.from('rows').update({ data }).eq('id', rowId).throwOnError(),

  onMutate: async ({ rowId, data }) => {
    await queryClient.cancelQueries({ queryKey: ['rows', collectionId] });
    const previousRows = queryClient.getQueryData(['rows', collectionId]);
    queryClient.setQueryData(['rows', collectionId], (old) =>
      old.map(r => r.id === rowId ? { ...r, data: { ...r.data, ...data } } : r)
    );
    return { previousRows };
  },

  onError: (_err, _vars, context) => {
    queryClient.setQueryData(['rows', collectionId], context.previousRows);
    toast.error('Failed to update row');
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
  },
});
```

---

## 24. Realtime Strategy

### 24.1 Subscriptions
Supabase Realtime is used selectively — not for all tables, only where live updates add value:

- **`rows` table** — subscribed when a Live Source collection is open. When the background sync (Edge Function) inserts/updates rows, the frontend gets notified and TanStack Query cache is invalidated.
- **`collections` table** — subscribed to `sync_status` column changes. When a sync starts/completes/fails, the Live Source badge in the Collection header updates in real time.

### 24.2 Subscription Setup
```typescript
// In CollectionPage, when is_live_source is true
useEffect(() => {
  const channel = supabase
    .channel(`rows:${collectionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'rows',
      filter: `collection_id=eq.${collectionId}`,
    }, () => {
      queryClient.invalidateQueries({ queryKey: ['rows', collectionId] });
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [collectionId]);
```

---

## 25. File & Folder Structure

```
kern/
├── public/
│   ├── favicon.ico
│   └── kern-logo.svg
│
├── src/
│   ├── main.tsx                          # Vite entry. Renders <App /> with providers.
│   ├── App.tsx                           # Router setup with createBrowserRouter.
│   │
│   ├── lib/
│   │   ├── supabase.ts                   # Supabase client singleton. createClient().
│   │   ├── utils.ts                      # cn(), slugify(), formatRelativeTime(), generateId()
│   │   ├── constants.ts                  # FIELD_TYPES, VIEW_TYPES, SELECT_COLORS, etc.
│   │   └── field-operators.ts           # OPERATORS_BY_FIELD_TYPE map
│   │
│   ├── types/
│   │   ├── database.ts                   # Supabase CLI generated types. Do not edit manually.
│   │   └── kern.ts                       # App types: KernCollection, KernRow, KernField, etc.
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                    # Auth context hook (reads AuthProvider)
│   │   ├── useCollections.ts             # useCollections(), useCollection(slug)
│   │   ├── useFields.ts                  # useFields(collectionId)
│   │   ├── useRows.ts                    # useRows(collectionId, viewConfig), mutations
│   │   ├── useRow.ts                     # useRow(rowId) — full row with relations
│   │   ├── useViews.ts                   # useViews(collectionId), mutations
│   │   ├── useRelations.ts               # useRelations(rowId)
│   │   ├── useDashboard.ts               # useWidgets(), mutations
│   │   ├── useCustomViews.ts             # useCustomViews()
│   │   └── useCommandRegistry.ts        # Builds schema-aware command list for palette
│   │
│   ├── stores/
│   │   ├── appStore.ts                   # Zustand: sidebar, palette, row editor, theme
│   │   └── commandStore.ts               # Zustand: recent commands (persisted to localStorage)
│   │
│   ├── providers/
│   │   ├── AuthProvider.tsx              # Supabase session listener. Provides useAuth().
│   │   ├── QueryProvider.tsx             # TanStack Query client setup.
│   │   └── ThemeProvider.tsx             # Applies data-theme attribute to <html>
│   │
│   ├── components/
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx             # Email + password sign in form
│   │   │   ├── SignupForm.tsx            # Email + password + name sign up form
│   │   │   ├── MagicLinkForm.tsx         # Magic link request form
│   │   │   └── ProtectedRoute.tsx        # Route wrapper. Redirects to /login if no session.
│   │   │
│   │   ├── layout/
│   │   │   ├── AppShell.tsx              # Root layout: Topbar + Sidebar + Outlet
│   │   │   ├── Sidebar.tsx               # Collections list, drag-to-reorder, nav
│   │   │   ├── SidebarCollectionItem.tsx # Individual collection entry in sidebar
│   │   │   ├── Topbar.tsx                # Logo, breadcrumb, user avatar menu
│   │   │   └── UserMenu.tsx              # Radix DropdownMenu for avatar: settings, signout
│   │   │
│   │   ├── command/
│   │   │   ├── CommandPalette.tsx        # Radix Dialog + cmdk Command. Full palette.
│   │   │   ├── CommandGroup.tsx          # Labeled group of commands
│   │   │   └── CommandItem.tsx           # Individual command item with icon + label + shortcut
│   │   │
│   │   ├── collection/
│   │   │   ├── CollectionHeader.tsx      # Icon, name, view tabs, filter/sort/fields buttons
│   │   │   ├── CollectionViewTabs.tsx    # Radix Tabs for switching views
│   │   │   ├── CreateCollectionModal.tsx # New collection form modal
│   │   │   ├── EditCollectionModal.tsx   # Edit collection form modal
│   │   │   ├── DeleteCollectionDialog.tsx# Confirm delete with name-typing confirmation
│   │   │   ├── CollectionIcon.tsx        # Renders emoji + color background
│   │   │   └── CollectionActionsMenu.tsx # ⋯ dropdown: edit, export, delete, connect source
│   │   │
│   │   ├── field/
│   │   │   ├── FieldPanel.tsx            # Slide-in panel for add/edit field
│   │   │   ├── FieldTypeGrid.tsx         # Grid of field type options with icons
│   │   │   ├── FieldTypeIcon.tsx         # Returns Lucide icon for a given field type
│   │   │   ├── SelectOptionsEditor.tsx   # Add/edit/reorder select options with color picker
│   │   │   ├── NumberFieldOptions.tsx    # Unit, decimal places, progress options
│   │   │   └── RelationFieldOptions.tsx  # Target collection picker
│   │   │
│   │   ├── row/
│   │   │   ├── RowEditorPanel.tsx        # Right-side panel for full row editing
│   │   │   ├── RowEditorField.tsx        # Single field editor in row panel (label + value)
│   │   │   ├── RowContextMenu.tsx        # Radix ContextMenu on right-click row
│   │   │   ├── RelationPicker.tsx        # Popover for picking related rows
│   │   │   ├── RelationPill.tsx          # Clickable pill showing related row name
│   │   │   ├── ReferencedBySection.tsx   # Reverse relations section in row editor
│   │   │   └── BulkActionBar.tsx         # Floating bar when rows are selected
│   │   │
│   │   ├── cells/
│   │   │   ├── CellRenderer.tsx          # Dispatcher: renders correct cell by field type
│   │   │   ├── TextCell.tsx
│   │   │   ├── RichTextCell.tsx
│   │   │   ├── NumberCell.tsx
│   │   │   ├── DateCell.tsx
│   │   │   ├── DateTimeCell.tsx
│   │   │   ├── BooleanCell.tsx
│   │   │   ├── SelectCell.tsx
│   │   │   ├── MultiSelectCell.tsx
│   │   │   ├── UrlCell.tsx
│   │   │   ├── EmailCell.tsx
│   │   │   ├── PhoneCell.tsx
│   │   │   ├── RelationCell.tsx
│   │   │   └── FileCell.tsx
│   │   │
│   │   ├── views/
│   │   │   ├── ViewFilterBar.tsx         # Filter rule builder popover
│   │   │   ├── ViewSortBar.tsx           # Sort rule builder popover
│   │   │   ├── ViewFieldsMenu.tsx        # Field visibility toggles popover
│   │   │   ├── ViewOptionsMenu.tsx       # View-specific options (group-by, density, etc.)
│   │   │   │
│   │   │   ├── TableView/
│   │   │   │   ├── TableView.tsx         # TanStack Table + TanStack Virtual
│   │   │   │   ├── TableColumnHeader.tsx # Sortable, resizable column header
│   │   │   │   ├── TableRow.tsx          # Row component with hover state
│   │   │   │   └── TableAddRow.tsx       # Empty last row for inline creation
│   │   │   │
│   │   │   ├── KanbanView/
│   │   │   │   ├── KanbanView.tsx        # dnd-kit DndContext wrapper + columns
│   │   │   │   ├── KanbanColumn.tsx      # Single column with cards list
│   │   │   │   └── KanbanCard.tsx        # Draggable card
│   │   │   │
│   │   │   ├── CalendarView/
│   │   │   │   ├── CalendarView.tsx      # Month/week/day switcher + renderer
│   │   │   │   ├── CalendarMonth.tsx     # Month grid
│   │   │   │   ├── CalendarWeek.tsx      # Week time grid
│   │   │   │   └── CalendarEvent.tsx     # Event pill/block
│   │   │   │
│   │   │   ├── GalleryView/
│   │   │   │   ├── GalleryView.tsx       # Grid layout
│   │   │   │   └── GalleryCard.tsx       # Individual card
│   │   │   │
│   │   │   ├── ListView/
│   │   │   │   └── ListView.tsx
│   │   │   │
│   │   │   └── CustomView/
│   │   │       ├── CustomViewRenderer.tsx  # iframe sandbox renderer
│   │   │       ├── CustomViewEditor.tsx    # Monaco editor + live preview
│   │   │       └── CustomViewEditorPage.tsx # Full-page editor layout
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx             # Grid layout with all widgets
│   │   │   ├── DashboardHeader.tsx       # Title + add widget button
│   │   │   ├── AddWidgetModal.tsx        # Widget type picker + config form
│   │   │   ├── WidgetWrapper.tsx         # Drag, resize, and remove chrome around widget
│   │   │   └── widgets/
│   │   │       ├── CollectionStatsWidget.tsx
│   │   │       ├── RecentRowsWidget.tsx
│   │   │       ├── ViewEmbedWidget.tsx
│   │   │       ├── LiveSourceStatusWidget.tsx
│   │   │       └── QuickAddWidget.tsx
│   │   │
│   │   ├── live-sources/
│   │   │   ├── ConnectLiveSourceModal.tsx  # Source picker + OAuth redirect
│   │   │   ├── LiveSourceBadge.tsx         # Status indicator in collection header
│   │   │   ├── LiveSourceSettingsPopover.tsx # Sync now + configure + disconnect
│   │   │   └── sources/
│   │   │       ├── GitHubSourceConfig.tsx
│   │   │       ├── GoogleCalendarSourceConfig.tsx
│   │   │       ├── NotionSourceConfig.tsx
│   │   │       ├── LinearSourceConfig.tsx
│   │   │       ├── RSSSourceConfig.tsx
│   │   │       └── AkiflowSourceConfig.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx                # Variant: primary/secondary/ghost/danger. Sizes: sm/md/lg.
│   │       ├── Input.tsx                 # Controlled text input with label + error display
│   │       ├── Textarea.tsx
│   │       ├── Modal.tsx                 # Radix Dialog wrapper with standard layout
│   │       ├── Popover.tsx               # Radix Popover wrapper
│   │       ├── DropdownMenu.tsx          # Radix DropdownMenu wrapper
│   │       ├── ContextMenu.tsx           # Radix ContextMenu wrapper
│   │       ├── Toast.tsx                 # Sonner toast setup
│   │       ├── Skeleton.tsx              # Animated loading placeholder
│   │       ├── Badge.tsx                 # Small status badge
│   │       ├── Tooltip.tsx               # Radix Tooltip wrapper
│   │       ├── ScrollArea.tsx            # Radix ScrollArea wrapper
│   │       ├── Separator.tsx             # Horizontal/vertical divider
│   │       ├── EmojiPicker.tsx           # Emoji grid for collection icon selection
│   │       ├── ColorPicker.tsx           # Preset color swatches
│   │       ├── EmptyState.tsx            # Reusable empty state with icon + title + CTA
│   │       ├── Kbd.tsx                   # Keyboard shortcut display component
│   │       └── Spinner.tsx               # Loading spinner
│   │
│   └── pages/
│       ├── LoginPage.tsx                 # Route: /login
│       ├── SignupPage.tsx                # Route: /signup
│       ├── DashboardPage.tsx             # Route: /dashboard (default)
│       ├── CollectionPage.tsx            # Route: /c/:slug
│       ├── SettingsPage.tsx              # Route: /settings
│       │   # Settings tabs: Profile, Appearance, Integrations (MCP), Custom Views, Danger Zone
│       └── NotFoundPage.tsx              # Route: *
│
├── supabase/
│   ├── config.toml                       # Supabase CLI config
│   ├── seed.sql                          # Optional: seed data for dev
│   ├── migrations/
│   │   ├── 00001_create_handle_updated_at.sql
│   │   ├── 00002_create_profiles.sql
│   │   ├── 00003_create_handle_new_user.sql
│   │   ├── 00004_create_collections.sql
│   │   ├── 00005_create_fields.sql
│   │   ├── 00006_create_rows.sql
│   │   ├── 00007_create_row_relations.sql
│   │   ├── 00008_create_views.sql
│   │   ├── 00009_create_dashboard_widgets.sql
│   │   ├── 00010_create_custom_views_registry.sql
│   │   ├── 00011_rls_policies.sql
│   │   └── 00012_indexes_and_functions.sql
│   │
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts                   # Shared CORS headers
│       │   ├── auth.ts                   # JWT validation helper
│       │   └── crypto.ts                 # Encryption/decryption for live source tokens
│       │
│       ├── kern-mcp/
│       │   └── index.ts                  # MCP server entry point
│       │
│       ├── sync-github/
│       │   └── index.ts
│       │
│       ├── sync-google-calendar/
│       │   └── index.ts
│       │
│       ├── sync-notion/
│       │   └── index.ts
│       │
│       ├── sync-linear/
│       │   └── index.ts
│       │
│       ├── sync-rss/
│       │   └── index.ts
│       │
│       └── live-source-webhook/
│           └── index.ts                  # Generic webhook receiver for GitHub/Linear pushes
│
├── .env.local                             # Not committed
├── .env.example                           # Template. Committed.
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── README.md
```

---

## 26. Environment Variables & Configuration

### `.env.local` (local dev — never commit)
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your_local_anon_key_from_supabase_start_output>
```

### `.env.example` (committed to git)
```env
# Supabase (required)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Supabase Edge Function Secrets (set via `supabase secrets set KEY=VALUE`)
```env
# Live Source OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=

# Token encryption
ENCRYPTION_KEY=                  # 32-char random string for AES-256

# Supabase service key for Edge Functions to write to DB bypassing RLS
SUPABASE_SERVICE_ROLE_KEY=       # Found in Supabase project API settings
```

---

## 27. Supabase Project Configuration

### Local Development Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project root
supabase init

# Start local Supabase stack
supabase start
# → Outputs: API URL, anon key, service role key, Studio URL

# Copy the anon key into .env.local

# Run migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# Access Studio at http://localhost:54323
```

### Auth Configuration (Supabase Dashboard → Auth → Settings)
- **Site URL:** `http://localhost:5173` (dev), `https://kern.yourdomain.com` (prod)
- **Redirect URLs:** `http://localhost:5173/**`, `https://kern.yourdomain.com/**`
- **Email auth:** Enabled
- **Magic links:** Enabled
- **Confirm email:** Disabled for dev (enable for prod)

### Storage Buckets
```sql
-- Run in Supabase SQL editor or migration
insert into storage.buckets (id, name, public) values ('kern-files', 'kern-files', false);
insert into storage.buckets (id, name, public) values ('kern-avatars', 'kern-avatars', true);

-- RLS for kern-files
create policy "Users can manage own files"
  on storage.objects for all
  using (auth.uid()::text = (storage.foldername(name))[1]);

-- RLS for kern-avatars (public read, user write)
create policy "Avatars are public"
  on storage.objects for select
  using (bucket_id = 'kern-avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (auth.uid()::text = (storage.foldername(name))[1]);
```

### pg_cron Setup (for scheduled live source sync)
```sql
-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Schedule GitHub sync every 15 minutes
select cron.schedule(
  'sync-github',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://<project-ref>.supabase.co/functions/v1/sync-github',
      headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
    );
  $$
);
```