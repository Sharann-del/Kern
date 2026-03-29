# KERN — Phase-wise Build Plan & Cursor Prompts

---

## HOW TO USE THIS FILE

Each task has:
- **What it builds** — what gets created/completed
- **Depends on** — what must be done first
- **Cursor Prompt** — paste this directly into Cursor. Each prompt is scoped to be completable in a single Cursor response.

**Key rule:** Database schema is always created AND TypeScript types generated in the same task. Every subsequent task can immediately use the typed Supabase client and frontend types.

**Start each session** by opening `KERN_PRD_SPEC.md` in Cursor and saying:
> *"We're building Kern, a personal data OS. The full PRD is in `KERN_PRD_SPEC.md`. Reference it for all types, patterns, and decisions. Don't deviate from the schema or architecture defined there."*

**File outputs per task** — what Cursor creates:
Every prompt ends with a summary of files created. If Cursor stops mid-task, paste the prompt again with "Continue where you left off."

---

## PHASE 1 — MVP Core (Weeks 1–4)

### BLOCK 1: Project Scaffolding & Infrastructure

---

#### TASK 1.1 — Initialize Vite + React + TypeScript Project

**What it builds:** The entire project scaffold with all dependencies installed and configured.
**Depends on:** Nothing.
**Files created:** `package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/index.css`, `.env.local`, `.env.example`, `.prettierrc`, `.gitignore`

**Cursor Prompt:**
```
Create a new Vite + React + TypeScript project called "kern" with the following complete setup.

STEP 1 — Initialize:
Run: npm create vite@latest kern -- --template react-ts
CD into kern/

STEP 2 — Install all frontend dependencies in one command:
npm install react-router-dom@6 @tanstack/react-query@5 @tanstack/react-table@8 @tanstack/react-virtual@3 zustand@4 date-fns@3 lucide-react sonner cmdk @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities clsx tailwind-merge @tiptap/react @tiptap/starter-kit

STEP 3 — Install all Radix UI primitives:
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-tooltip @radix-ui/react-scroll-area @radix-ui/react-tabs @radix-ui/react-separator @radix-ui/react-avatar @radix-ui/react-context-menu @radix-ui/react-toggle @radix-ui/react-collapsible

STEP 4 — Install Supabase:
npm install @supabase/supabase-js

STEP 5 — Install Tailwind:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

STEP 6 — Install dev tools:
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react-hooks eslint-plugin-react-refresh prettier

STEP 7 — Configure tailwind.config.ts:
Set content: ['./index.html', './src/**/*.{ts,tsx}']
Extend theme.colors with these exact tokens:
  kern-bg: '#ffffff'
  kern-surface: '#f9f9f8'
  kern-surface-2: '#f2f2f0'
  kern-border: '#e8e8e6'
  kern-border-2: '#d4d4d1'
  kern-text: '#1a1a19'
  kern-text-2: '#6f6e6a'
  kern-text-3: '#a19f99'
  kern-accent: '#5b5bd6'
  kern-accent-2: '#e8e8f8'
  kern-danger: '#e5484d'
  kern-success: '#30a46c'
  kern-warning: '#f59e0b'
Extend theme.borderRadius with:
  kern-sm: '4px', kern-md: '6px', kern-lg: '8px', kern-xl: '12px'

STEP 8 — Update src/index.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

Add CSS variables inside :root for all kern colors (HSL or hex, your choice) so dark mode can work via data-theme="dark" on html element.

STEP 9 — Configure tsconfig.json:
Set "strict": true
Add paths: { "@/*": ["./src/*"] }

STEP 10 — Update vite.config.ts:
Add resolve.alias: { '@': path.resolve(__dirname, './src') }
Import path from 'node:path'

STEP 11 — Create .env.local:
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=placeholder_replace_after_supabase_start

STEP 12 — Create .env.example (commit this):
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

STEP 13 — Add to .gitignore: .env.local

STEP 14 — Create .prettierrc:
{ "singleQuote": true, "semi": true, "printWidth": 100, "tabWidth": 2, "trailingComma": "es5" }

STEP 15 — Clean up Vite boilerplate:
Delete: src/App.css, src/assets/react.svg, public/vite.svg
Replace src/App.tsx content with just: export default function App() { return <div className="text-kern-accent font-mono">kern</div> }
Remove the logo import from index.html if present.

VERIFY: npm run dev should start without errors. The page should show "kern" in indigo. No TypeScript errors (run npx tsc --noEmit).
```

---

#### TASK 1.2 — Supabase Setup & Complete Database Schema

**What it builds:** Full local Supabase stack, all 8 tables, RLS, indexes, triggers, and generated TypeScript types usable immediately in frontend code.
**Depends on:** Task 1.1
**Files created:** `supabase/migrations/00001-00012_*.sql`, `src/types/database.ts` (generated), `src/types/kern.ts`, `src/lib/supabase.ts`, `src/lib/constants.ts`, `src/lib/utils.ts`

**Cursor Prompt:**
```
Set up Supabase local development and create ALL database migrations for Kern. This is the foundation — the schema must be complete and correct before any frontend code runs.

STEP 1 — Initialize Supabase:
supabase init

STEP 2 — Create migration files in supabase/migrations/ in this exact order:

--- FILE: 00001_create_handle_updated_at.sql ---
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

--- FILE: 00002_create_profiles.sql ---
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  preferences jsonb not null default '{"theme":"light","sidebar_collapsed":false}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view and edit own profile" on public.profiles for all using (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();

--- FILE: 00003_create_handle_new_user.sql ---
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

--- FILE: 00004_create_collections.sql ---
create table public.collections (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  name                text not null,
  slug                text not null,
  icon                text,
  color               text,
  description         text,
  is_live_source      boolean not null default false,
  live_source_type    text,
  live_source_config  jsonb,
  last_synced_at      timestamptz,
  sync_status         text not null default 'idle',
  sync_error_message  text,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(user_id, slug)
);
alter table public.collections enable row level security;
create policy "Users can manage own collections" on public.collections for all using (auth.uid() = user_id);
create trigger collections_updated_at before update on public.collections for each row execute procedure public.handle_updated_at();

--- FILE: 00005_create_fields.sql ---
create table public.fields (
  id                   uuid default gen_random_uuid() primary key,
  collection_id        uuid references public.collections(id) on delete cascade not null,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  name                 text not null,
  slug                 text not null,
  type                 text not null,
  options              jsonb,
  is_required          boolean not null default false,
  is_primary           boolean not null default false,
  is_hidden_by_default boolean not null default false,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  unique(collection_id, slug)
);
alter table public.fields enable row level security;
create policy "Users can manage own fields" on public.fields for all using (auth.uid() = user_id);

--- FILE: 00006_create_rows.sql ---
create table public.rows (
  id            uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  data          jsonb not null default '{}',
  external_id   text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.rows enable row level security;
create policy "Users can manage own rows" on public.rows for all using (auth.uid() = user_id);
create trigger rows_updated_at before update on public.rows for each row execute procedure public.handle_updated_at();

--- FILE: 00007_create_row_relations.sql ---
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
create policy "Users can manage own row relations" on public.row_relations for all using (auth.uid() = user_id);

--- FILE: 00008_create_views.sql ---
create table public.views (
  id            uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  name          text not null,
  type          text not null,
  config        jsonb not null default '{"hidden_fields":[],"filters":[],"sorts":[],"group_by_field":null,"calendar_date_field":null,"gallery_cover_field":null,"gallery_card_fields":[],"table_column_widths":{},"kanban_collapsed_columns":[]}',
  custom_view_id uuid,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.views enable row level security;
create policy "Users can manage own views" on public.views for all using (auth.uid() = user_id);
create trigger views_updated_at before update on public.views for each row execute procedure public.handle_updated_at();

--- FILE: 00009_create_dashboard_widgets.sql ---
create table public.dashboard_widgets (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  type       text not null,
  title      text,
  config     jsonb not null default '{}',
  position_x integer not null,
  position_y integer not null,
  width      integer not null default 2,
  height     integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dashboard_widgets enable row level security;
create policy "Users can manage own widgets" on public.dashboard_widgets for all using (auth.uid() = user_id);

--- FILE: 00010_create_custom_views_registry.sql ---
create table public.custom_views_registry (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  name           text not null,
  description    text,
  code           text not null,
  compiled_code  text,
  is_published   boolean not null default false,
  published_slug text unique,
  thumbnail_url  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.custom_views_registry enable row level security;
create policy "Users can manage own custom views" on public.custom_views_registry for all using (auth.uid() = user_id);
create policy "Published views are public" on public.custom_views_registry for select using (is_published = true);

--- FILE: 00011_add_foreign_keys_and_indexes.sql ---
-- FK from views to custom_views_registry (needs both tables to exist)
alter table public.views add constraint views_custom_view_id_fkey
  foreign key (custom_view_id) references public.custom_views_registry(id) on delete set null;

-- Unique constraint on rows for live source upserts
create unique index rows_collection_external_id_unique 
  on public.rows(collection_id, external_id) 
  where external_id is not null;

-- Performance indexes
create index rows_collection_id_user_id_idx on public.rows(collection_id, user_id);
create index rows_created_at_idx on public.rows(created_at desc);
create index rows_data_gin_idx on public.rows using gin(data);
create index fields_collection_id_idx on public.fields(collection_id);
create index fields_sort_order_idx on public.fields(collection_id, sort_order);
create index views_collection_id_idx on public.views(collection_id);
create index row_relations_source_idx on public.row_relations(source_row_id);
create index row_relations_target_idx on public.row_relations(target_row_id);
create index row_relations_field_idx on public.row_relations(field_id);
create index collections_user_id_idx on public.collections(user_id);
create index collections_sort_order_idx on public.collections(user_id, sort_order);

-- Utility function for row counts
create or replace function public.get_collection_row_count(p_collection_id uuid)
returns bigint language sql security definer as $$
  select count(*) from public.rows where collection_id = p_collection_id and user_id = auth.uid();
$$;

-- RPC to remove a field slug from all rows in a collection (used when deleting a field)
create or replace function public.remove_field_from_rows(p_collection_id uuid, p_field_slug text)
returns void language sql security definer as $$
  update public.rows set data = data - p_field_slug where collection_id = p_collection_id;
$$;

STEP 3 — Start and apply:
supabase start
supabase db push

STEP 4 — Generate TypeScript types (run this after supabase start):
supabase gen types typescript --local > src/types/database.ts

STEP 5 — Create src/types/kern.ts with ALL these exact types:

export type FieldType = 'text' | 'rich_text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multi_select' | 'url' | 'email' | 'phone' | 'relation' | 'file';
export type ViewType = 'table' | 'kanban' | 'calendar' | 'gallery' | 'list' | 'custom';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type LiveSourceType = 'github_prs' | 'github_issues' | 'github_repos' | 'google_calendar_events' | 'notion_database' | 'linear_issues' | 'linear_projects' | 'rss_feed' | 'akiflow_tasks' | 'apple_calendar_events';
export type FilterOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' | 'is_true' | 'is_false' | 'before' | 'after' | 'on';
export type DashboardWidgetType = 'collection_stats' | 'recent_rows' | 'view_embed' | 'live_source_status' | 'quick_add';

export interface SelectOption { id: string; label: string; color: string; sort_order: number; }
export interface SelectFieldOptions { items: SelectOption[]; }
export interface NumberFieldOptions { unit?: string; decimal_places?: number; show_as_progress?: boolean; min?: number; max?: number; }
export interface RelationFieldOptions { target_collection_id: string; display: 'single' | 'multiple'; }
export interface FileFieldOptions { max_size_mb?: number; allowed_types?: string[]; }
export type FieldOptions = SelectFieldOptions | NumberFieldOptions | RelationFieldOptions | FileFieldOptions | null;

export interface FilterRule { id: string; field_slug: string; operator: FilterOperator; value: unknown; }
export interface SortRule { id: string; field_slug: string; direction: 'asc' | 'desc'; }
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

export interface KernProfile { id: string; email: string; full_name: string | null; avatar_url: string | null; preferences: { theme: 'light' | 'dark'; sidebar_collapsed: boolean; }; created_at: string; updated_at: string; }
export interface KernCollection { id: string; user_id: string; name: string; slug: string; icon: string | null; color: string | null; description: string | null; is_live_source: boolean; live_source_type: LiveSourceType | null; live_source_config: Record<string, unknown> | null; last_synced_at: string | null; sync_status: SyncStatus; sync_error_message: string | null; sort_order: number; created_at: string; updated_at: string; row_count?: number; }
export interface KernField { id: string; collection_id: string; user_id: string; name: string; slug: string; type: FieldType; options: FieldOptions; is_required: boolean; is_primary: boolean; is_hidden_by_default: boolean; sort_order: number; created_at: string; }
export interface KernRow { id: string; collection_id: string; user_id: string; data: Record<string, unknown>; external_id: string | null; sort_order: number; created_at: string; updated_at: string; relations?: Record<string, KernRow[]>; }
export interface KernView { id: string; collection_id: string; user_id: string; name: string; type: ViewType; config: ViewConfig; custom_view_id: string | null; sort_order: number; created_at: string; updated_at: string; }
export interface KernRowRelation { id: string; user_id: string; source_row_id: string; target_row_id: string; field_id: string; created_at: string; }
export interface KernCustomView { id: string; user_id: string; name: string; description: string | null; code: string; compiled_code: string | null; is_published: boolean; published_slug: string | null; created_at: string; updated_at: string; }
export interface KernViewProps { rows: KernRow[]; fields: KernField[]; collectionName: string; onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>; onRowCreate: (data: Record<string, unknown>) => Promise<void>; onRowDelete: (rowId: string) => Promise<void>; onRowClick: (rowId: string) => void; }
export interface DashboardWidget { id: string; user_id: string; type: DashboardWidgetType; title: string | null; config: Record<string, unknown>; position_x: number; position_y: number; width: number; height: number; created_at: string; updated_at: string; }

STEP 6 — Create src/lib/supabase.ts:
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

STEP 7 — Create src/lib/constants.ts:
Export all of these:
- FIELD_TYPES: Array<{ type: FieldType, label: string, description: string }> — one entry per field type
- VIEW_TYPES: Array<{ type: ViewType, label: string }>
- SELECT_COLORS: string[] — 12 hex colors (vibrant, distinct: use rose, orange, amber, yellow, lime, green, teal, cyan, blue, indigo, purple, pink)
- COLLECTION_COLORS: string[] — same 12 colors
- DEFAULT_VIEW_CONFIG: ViewConfig — the empty default config object

STEP 8 — Create src/lib/utils.ts:
Export these functions with correct implementations:
- cn(...inputs: ClassValue[]): string — clsx + twMerge
- slugify(text: string): string — lowercase, replace spaces/special chars with hyphens, trim hyphens
- formatRelativeTime(date: string | Date): string — "just now", "2m ago", "3h ago", "yesterday", "Mar 22", "Mar 22, 2025" (year only if different year)
- generateId(): string — crypto.randomUUID()
- getPrimaryField(fields: KernField[]): KernField | undefined — find field where is_primary === true
- getDisplayValue(row: KernRow, fields: KernField[]): string — gets primary field value as string, fallback to row.id.slice(0,8)
- formatFileSize(bytes: number): string — "1.2 MB", "340 KB", "12 B"

VERIFY: supabase start → supabase db push → npm run dev all succeed without errors. Supabase Studio accessible at http://localhost:54323.
```

---

#### TASK 1.3 — Auth Provider, Login, Signup Pages

**What it builds:** Complete authentication system — AuthProvider context, hooks, Login, Signup, Magic Link, protected route wrapper, React Router setup.
**Depends on:** Task 1.2
**Files created:** `src/providers/AuthProvider.tsx`, `src/providers/QueryProvider.tsx`, `src/providers/ThemeProvider.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`, `src/pages/SignupPage.tsx`, `src/App.tsx`

**Cursor Prompt:**
```
Build the complete authentication system and app routing for Kern.

STEP 1 — Create src/providers/AuthProvider.tsx:
- Uses supabase.auth.onAuthStateChange() listener
- On session: fetches user's profile row from public.profiles
- Exposes via React context (create AuthContext):
  user: User | null
  profile: KernProfile | null
  loading: boolean
  signIn(email: string, password: string): Promise<void> — throws on error
  signUp(email: string, password: string, fullName?: string): Promise<void> — throws on error
  signInWithMagicLink(email: string): Promise<void>
  signOut(): Promise<void>
  updateProfile(data: Partial<Pick<KernProfile, 'full_name' | 'avatar_url' | 'preferences'>>): Promise<void>
- Export useAuth() hook — throws Error("useAuth must be used inside AuthProvider") if context is null
- On mount: call supabase.auth.getSession() to restore existing session

STEP 2 — Create src/providers/QueryProvider.tsx:
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
Create QueryClient with defaultOptions:
  queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false }
Export QueryProvider wrapping children in QueryClientProvider.
The QueryClient instance must be created outside the component (module level) so it persists.

STEP 3 — Create src/providers/ThemeProvider.tsx:
- Reads 'kern-theme' from localStorage on mount (default: 'light')
- Applies document.documentElement.setAttribute('data-theme', theme)
- Provides useTheme() returning { theme: 'light' | 'dark', setTheme: (t) => void }
- setTheme: updates state + localStorage + document attribute

STEP 4 — Create src/components/auth/ProtectedRoute.tsx:
- Uses useAuth()
- If loading: render a full-screen loading state — centered "kern" wordmark in kern-accent monospace font + pulsing dots below
- If !user: <Navigate to="/login" replace />
- If user: <Outlet />

STEP 5 — Create src/pages/LoginPage.tsx:
Layout: full viewport with kern-surface background. Centered card: white bg, rounded-kern-xl, shadow-lg, padding 32px, width 400px.

Top of card: "kern" wordmark in kern-accent, monospace, bold, 24px
Two tabs below: "Sign in" and "Magic link" (use simple button tabs, not Radix — keep it light)

Sign in tab:
- Email input (type="email", autofocus)
- Password input (type="password")
- Error message area (red text, shown when auth fails)
- "Sign in" button (full width, primary variant)
- Loading state on button during signIn call

Magic link tab:
- Email input
- "Send magic link" button
- Success state: "Check your email for a login link" with a checkmark icon

Below card: "Don't have an account? Sign up →" link to /signup

On success: navigate('/dashboard')

STEP 6 — Create src/pages/SignupPage.tsx:
Same card layout.

Fields:
- Full name (optional but prompted)
- Email (required)
- Password (required, min 8 chars)
- Password strength indicator: show a bar below the password input
  - < 8 chars: red "Too short"
  - 8+ chars, no variety: yellow "Weak"
  - 8+ chars + uppercase or number: green "Good"

"Create account" button (full width, primary)
Error message area
Below card: "Already have an account? Sign in →"

On success: navigate('/dashboard')

STEP 7 — Create placeholder pages (minimal, just enough to route to):
src/pages/DashboardPage.tsx: returns <div className="p-8"><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-kern-text-2 mt-2">Coming soon...</p></div>
src/pages/CollectionPage.tsx: returns <div className="p-8"><h1>Collection</h1></div>
src/pages/SettingsPage.tsx: returns <div className="p-8"><h1>Settings</h1></div>
src/pages/NotFoundPage.tsx: returns a centered "404 — Page not found" with a "Go home" button

STEP 8 — Create src/App.tsx:
Use createBrowserRouter with this exact route tree:
- /login → LoginPage (unprotected)
- /signup → SignupPage (unprotected)
- /oauth/callback/:provider → OAuthCallbackPage (create a minimal placeholder: shows "Processing..." then navigates to /dashboard)
- / → ProtectedRoute → AppShell (placeholder: just <Outlet /> for now)
  - index → redirect to /dashboard
  - /dashboard → DashboardPage
  - /c/:slug → CollectionPage
  - /settings → SettingsPage
  - * → NotFoundPage

Wrap the entire app: RouterProvider → QueryProvider → AuthProvider → ThemeProvider

The ThemeProvider wraps the RouterProvider content. The QueryProvider and AuthProvider are inside RouterProvider since they don't need router context.

Correct nesting order in main.tsx:
<React.StrictMode>
  <QueryProvider>
    <RouterProvider router={router} />
  </QueryProvider>
</React.StrictMode>

AuthProvider and ThemeProvider should be inside the router (as part of the root layout) since they use router hooks.

Create src/components/layout/RootLayout.tsx:
Renders AuthProvider → ThemeProvider → Outlet
This is the element for the root "/" route before ProtectedRoute.

VERIFY: 
- npm run dev → app starts
- http://localhost:5173 → redirects to /login
- Sign up form works (creates account in local Supabase)
- Sign in works → redirected to /dashboard placeholder
- Sign out from /dashboard (add a temporary sign out button for now) → back to /login
```

---

#### TASK 1.4 — App Shell: Layout, Topbar, Sidebar Structure

**What it builds:** Full app chrome — topbar, sidebar, main content area, Zustand app store, global keyboard shortcut handler, user menu, Sonner toasts.
**Depends on:** Task 1.3
**Files created:** `src/stores/appStore.ts`, `src/components/layout/AppShell.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/UserMenu.tsx`, `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/EmptyState.tsx`

**Cursor Prompt:**
```
Build the Kern app shell — the full persistent layout chrome for all authenticated pages.

STEP 1 — Create src/stores/appStore.ts:
Use Zustand with persist middleware (from 'zustand/middleware').

Interface:
  sidebarCollapsed: boolean
  toggleSidebar(): void
  setSidebarCollapsed(v: boolean): void
  paletteOpen: boolean
  openPalette(): void
  closePalette(): void
  openRowId: string | null
  openRowCollectionId: string | null
  openRow(rowId: string, collectionId: string): void
  closeRow(): void
  activeCollectionSlug: string | null
  setActiveCollection(slug: string | null): void

Persist to localStorage only: sidebarCollapsed (key: 'kern-ui')
Everything else is session-only (not persisted).

STEP 2 — Create these UI primitives first (needed by all other components):

src/components/ui/Button.tsx:
Props: variant?: 'primary'|'secondary'|'ghost'|'danger' (default: 'secondary'), size?: 'sm'|'md'|'lg' (default: 'md'), loading?: boolean, disabled?, onClick?, type?, children, className?, asChild? (for Radix asChild pattern)

Styles:
- primary: bg-kern-accent text-white hover:bg-kern-accent/90
- secondary: bg-kern-surface border border-kern-border text-kern-text hover:bg-kern-surface-2
- ghost: bg-transparent text-kern-text-2 hover:bg-kern-surface hover:text-kern-text
- danger: bg-transparent text-kern-danger hover:bg-red-50 border border-transparent hover:border-red-200
Heights: sm=28px, md=32px, lg=36px
Font: text-sm (14px) for all
Loading: show <Loader2 className="animate-spin" size={14} /> replacing children, keep button disabled

src/components/ui/Input.tsx:
Props: label?, error?, helperText?, plus all standard HTML input attributes
Renders: label (text-xs text-kern-text-2 mb-1) → input → error or helperText
Input: w-full h-8 px-3 text-sm border border-kern-border rounded-kern-md bg-kern-bg
Focus: ring-2 ring-kern-accent/30 border-kern-accent outline-none
Error state: border-kern-danger ring-kern-danger/30

src/components/ui/Skeleton.tsx:
A div with: bg-kern-surface-2 rounded animate-pulse
Export also: SkeletonText (w-full h-4 rounded), SkeletonRow (h-9 w-full rounded-kern-md)

src/components/ui/EmptyState.tsx:
Props: icon: React.ComponentType<{ size?: number, className?: string }>, title: string, subtitle?: string, actionLabel?: string, onAction?: () => void
Layout: flex flex-col items-center justify-center gap-3 py-16 px-8 text-center
Icon: size=40, className="text-kern-text-3"
Title: text-sm font-medium text-kern-text
Subtitle: text-sm text-kern-text-2
Action: <Button variant="secondary" size="sm" onClick={onAction}>{actionLabel}</Button>

src/components/ui/Kbd.tsx:
Renders keyboard shortcut badge.
Props: children (e.g. "⌘K")
Style: text-[11px] font-mono px-1.5 py-0.5 rounded border border-kern-border bg-kern-surface-2 text-kern-text-3

STEP 3 — Create src/components/layout/AppShell.tsx:
Full viewport layout using CSS:
- Fixed topbar: position fixed, top 0, left 0, right 0, height 48px, z-index 50
- Fixed sidebar: position fixed, top 48px, left 0, bottom 0, z-index 40
- Main content: margin-top 48px, margin-left [sidebar width] (240px or 48px based on collapsed state), flex-1, overflow-y auto, min-height: calc(100vh - 48px)

Sidebar width transition: 200ms ease (use CSS transition on margin-left of main content)

Global keyboard shortcuts via useEffect:
window.addEventListener('keydown', handler)
- Cmd+K or Ctrl+K → if target is not input/textarea/[contenteditable]: appStore.openPalette()
- Cmd+\ or Ctrl+\ → appStore.toggleSidebar()
Cleanup: return () => window.removeEventListener(...)

Renders:
<div className="flex flex-col min-h-screen">
  <Topbar />
  <Sidebar />
  <main style={{ marginTop: 48, marginLeft: collapsed ? 48 : 240, transition: 'margin-left 200ms ease' }}>
    <Outlet />
  </main>
  <CommandPalette /> {/* Always mounted, shown/hidden by Zustand */}
  <RowEditorPanel /> {/* Always mounted, shown/hidden by Zustand */}
  <Toaster position="bottom-right" richColors closeButton />
</div>

Create CommandPalette and RowEditorPanel as empty placeholder components for now:
- CommandPalette: returns null (will be built in Task 1.13)
- RowEditorPanel: returns null (will be built in Task 1.10)

STEP 4 — Create src/components/layout/Topbar.tsx:
Fixed, full-width, 48px, bg-kern-bg, border-b border-kern-border, z-50

Left: 
- Sidebar toggle button (Menu icon or PanelLeft icon, ghost variant, 32px)
  onClick: appStore.toggleSidebar()
- "kern" text (font-mono font-bold text-kern-accent text-lg, ml-2)
- Breadcrumb: if activeCollectionSlug, show " / [Collection Name]" in text-kern-text-2

Right:
- UserMenu component

STEP 5 — Create src/components/layout/UserMenu.tsx:
Radix DropdownMenu.

Trigger: button — shows Radix Avatar (initials circle if no avatar_url, image if avatar_url)
Avatar: 32px circle, bg-kern-accent text-white font-medium text-sm
Initials: first letter of full_name or email

Dropdown content (min-width 180px, p-1):
- Header section (non-clickable): user full_name (bold, 13px) + email (text-kern-text-2, 12px)
- Separator
- "Settings" item → navigate('/settings')
- "Keyboard shortcuts" item → opens keyboard shortcuts modal (TODO, just console.log for now)
- Separator
- "Sign out" item → calls signOut() from useAuth(), then navigate('/login')

STEP 6 — Create src/components/layout/Sidebar.tsx:
Fixed left panel, top: 48px, bottom: 0, overflow-y: auto
bg-kern-surface border-r border-kern-border

When collapsed (48px wide): show only icons, no text, no section labels
When expanded (240px wide): full layout

Layout:
Section 1 — Top nav:
- "Dashboard" item: LayoutDashboard icon + "Dashboard" text → navigate('/dashboard')
  Active when pathname === '/dashboard': bg-kern-accent/10 text-kern-accent font-medium

Divider

Section 2 — Collections:
- Header: "COLLECTIONS" label (10px uppercase tracking-widest text-kern-text-3) + "+" button (Plus icon, ghost xs)
  "+" button: opens CreateCollectionModal (pass state setter as prop or use Zustand modal state)
- Collection list: empty for now (will be populated in Task 1.5)
  Placeholder: <SkeletonRow className="mx-2 my-1" /> × 3 while loading

Divider

Section 3 — Live Sources:
- Radix Collapsible with "LIVE SOURCES" header
- Collapsed by default
- Will be populated in Phase 2

Bottom (sticky bottom of sidebar):
- "+ New collection" button (full width when expanded, Plus icon only when collapsed)
  onClick: opens CreateCollectionModal

VERIFY: Layout renders with topbar + sidebar + main content. Sidebar collapses with Cmd+\. User menu shows user info and sign out works. Sonner is set up (test: import { toast } from 'sonner'; toast.success('Hello') works).
```

---

### BLOCK 2: Collections CRUD

---

#### TASK 1.5 — Collections Data Layer & Sidebar Population

**What it builds:** Full collections hook layer, sidebar renders real collections from Supabase with correct icons, row counts, drag-to-reorder, and the ⋯ action menu.
**Depends on:** Task 1.4
**Files created:** `src/hooks/useCollections.ts`, `src/components/layout/SidebarCollectionItem.tsx`, updated `src/components/layout/Sidebar.tsx`, `src/pages/CollectionPage.tsx` (enhanced placeholder)

**Cursor Prompt:**
```
Implement the collections data layer and make the sidebar show real collections from Supabase.

STEP 1 — Create src/hooks/useCollections.ts:
All hooks use useAuth() to get userId. Each query is gated — if !userId, return empty/disabled query.

useCollections():
  queryKey: ['collections', userId]
  queryFn: supabase.from('collections').select('*').order('sort_order', { ascending: true })
  staleTime: 60_000
  select: (data) => (data.data ?? []) as KernCollection[]

useCollection(slug: string):
  queryKey: ['collection', slug, userId]
  queryFn: supabase.from('collections').select('*').eq('slug', slug).single()
  Returns KernCollection or null

useCreateCollection():
  useMutation — mutationFn receives: { name, slug, icon, color, description }
  Steps:
    1. Insert into collections
    2. Insert default primary field: { collection_id: newCollection.id, user_id, name: 'Name', slug: 'name', type: 'text', is_primary: true, sort_order: 0 }
  onSuccess: invalidate ['collections', userId], navigate to /c/:newSlug

useUpdateCollection():
  mutationFn receives: { id, name, icon, color, description }
  Updates only those fields
  onSuccess: invalidate ['collections', userId] and ['collection', slug, userId]

useDeleteCollection():
  mutationFn receives: { id }
  Deletes from collections (FK cascades to fields, rows, views, relations)
  onSuccess: invalidate ['collections', userId], navigate to /dashboard

useReorderCollections():
  mutationFn receives: { id: string, sort_order: number }[]
  Supabase upsert of sort_order for each collection
  Optimistic update: update the cache immediately in onMutate

STEP 2 — Create src/components/layout/SidebarCollectionItem.tsx:
This is a sortable item (will be wrapped in @dnd-kit SortableItem).

Props: collection: KernCollection, isActive: boolean

Structure (when sidebar expanded):
- Flex row, h-8, px-2, rounded-kern-md, cursor-pointer
- Drag handle (GripVertical icon, size 14, opacity-0 group-hover:opacity-40): leftmost
- Collection icon: emoji (16px) or if no icon, a 16px colored square using collection.color
- Collection name: text-sm flex-1 truncate, max-width depends on collapsed state
- Row count: text-xs text-kern-text-3, shown as "(N)" when > 0
- ⋯ button: opacity-0 group-hover:opacity-100, opens DropdownMenu

Active state (isActive): bg-kern-accent/10 text-kern-accent
Hover state: bg-kern-surface-2

⋯ DropdownMenu items:
- "Edit" → calls onEdit prop
- "Duplicate" → calls onDuplicate (implement as useCreateCollection with name "[name] (copy)")
- Separator
- "Delete" → calls onDelete prop (red text)

When sidebar is collapsed (48px mode):
- Show only the emoji/color icon, no text
- Radix Tooltip wrapping the icon showing collection name (delayDuration={300})

STEP 3 — Update Sidebar.tsx to use useCollections():
- Use useCollections() hook
- While loading: show 3 SkeletonRow placeholders in the collection section
- Map collections where is_live_source === false to SidebarCollectionItem
- Map collections where is_live_source === true to LiveSources section (collapsed by default)
- If no manual collections and not loading: show EmptyState (small, inline, not centered):
  text-xs text-kern-text-3 px-4 py-2 "No collections yet"

Wrap the collection list in dnd-kit SortableContext:
- Import DndContext, closestCenter, SortableContext, verticalListSortingStrategy, useSortable from @dnd-kit
- Create SortableItem wrapper component inline in this file:
  function SortableItem({ id, children }) { const { ... } = useSortable({ id }); return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div> }
- DndContext onDragEnd: call useReorderCollections with updated sort_orders

Add state for which modal is open:
- createModalOpen: boolean
- editTarget: KernCollection | null
- deleteTarget: KernCollection | null

Import/render (below the Sidebar component, in the same file or as separate imports):
- CreateCollectionModal (placeholder import, will exist after Task 1.6)
- EditCollectionModal (placeholder)
- DeleteCollectionDialog (placeholder)

For now, render them as null/disabled until the modal components exist.

STEP 4 — Update src/pages/CollectionPage.tsx:
- Extract slug from useParams()
- useCollection(slug) to fetch the collection
- useEffect: call appStore.setActiveCollection(slug) on mount, appStore.setActiveCollection(null) on unmount
- Show loading skeleton while fetching
- Show "Collection not found" EmptyState with navigate('/dashboard') action if collection is null after loading
- Show collection.name + collection.icon in a large header (no real content yet — the full collection page comes in later tasks)

VERIFY: Sidebar shows your collections. Creating a collection via Supabase Studio directly and refreshing the app shows it. Clicking a collection navigates to /c/:slug. Drag reorder works.
```

---

#### TASK 1.6 — Create & Edit Collection Modals

**What it builds:** Full Create and Edit modals with emoji picker, color picker, slug validation, and working Supabase mutations.
**Depends on:** Task 1.5
**Files created:** `src/components/ui/Modal.tsx`, `src/components/ui/EmojiPicker.tsx`, `src/components/ui/ColorPicker.tsx`, `src/components/ui/Popover.tsx`, `src/components/ui/DropdownMenu.tsx`, `src/components/collection/CreateCollectionModal.tsx`, `src/components/collection/EditCollectionModal.tsx`, `src/components/collection/DeleteCollectionDialog.tsx`

**Cursor Prompt:**
```
Build the collection creation/editing modals and the shared UI primitives they need.

STEP 1 — Create src/components/ui/Modal.tsx:
Wrapper around Radix Dialog.
Props: open: boolean, onOpenChange: (v: boolean) => void, title: string, description?: string, children: ReactNode, footer?: ReactNode, maxWidth?: number (default 520)

Structure:
- DialogOverlay: fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in
- DialogContent: fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kern-bg rounded-kern-xl shadow-xl border border-kern-border
  animate-in: fade-in + zoom-in-95, duration-150
  max-width: maxWidth prop in px, w-full, m-4
- DialogHeader: px-6 pt-5 pb-4 border-b border-kern-border, flex items-center justify-between
  Title: text-base font-semibold text-kern-text
  Close button: X icon, ghost variant, 28px
- DialogBody: px-6 py-5 (children go here)
- DialogFooter (if footer prop): px-6 pb-5 pt-4 border-t border-kern-border, flex items-center justify-end gap-2

STEP 2 — Create src/components/ui/Popover.tsx:
Radix Popover wrapper.
Props: trigger: ReactNode, children: ReactNode, open?: boolean, onOpenChange?, align?: 'start'|'center'|'end', side?: 'top'|'bottom'|'left'|'right'

PopoverContent styling: bg-kern-bg border border-kern-border rounded-kern-lg shadow-lg p-2 z-50
animate-in: fade-in + zoom-in-95, duration-150

STEP 3 — Create src/components/ui/DropdownMenu.tsx:
Radix DropdownMenu wrapper.
Export: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel

DropdownMenuContent: bg-kern-bg border border-kern-border rounded-kern-lg shadow-lg p-1 min-w-[160px] z-50
DropdownMenuItem: flex items-center gap-2 px-2 py-1.5 text-sm rounded-kern-sm cursor-pointer text-kern-text
  hover: bg-kern-surface-2
  data-[variant=danger]: text-kern-danger hover:bg-red-50
DropdownMenuSeparator: border-t border-kern-border my-1
DropdownMenuLabel: text-xs text-kern-text-3 px-2 py-1 uppercase tracking-widest

STEP 4 — Create src/components/ui/EmojiPicker.tsx:
Props: value: string, onChange: (emoji: string) => void

Trigger: a button rendering the emoji (or 📦 if empty), 32px, rounded-kern-md, border border-kern-border, hover:bg-kern-surface-2

Inside Popover (300px wide):
- Search input (Lucide Search icon prefix, compact)
- Emoji grid: display a hardcoded curated array of ~100 emojis spanning: 
  Objects: 📦 📁 📋 📌 📍 🔖 🏷️ 📎 📏 📐 ✂️ 🗂️ 📂
  Activities: 🎯 🎮 🎲 🎨 🎭 🎬 🎤 🎸 🏋️ 🧘 🏃 ⚽ 📚
  Nature: 🌱 🌿 🍃 🌊 ⛰️ 🌅 🌙 ⭐ 🌸 🍀 🦋 🐱 🐶
  Food: 🍎 🥑 🍕 ☕ 🍵 🥤 🍰 🍓
  Symbols: ✅ ❌ ⚡ 🔥 💡 🔑 🛡️ ⚙️ 🔔 💬 📊 📈 💰 🏆
  Faces: 😊 🤔 💪 🎉 🚀 💎 🌟 ❤️
- Grid: 8 columns of 32px emoji buttons
- Filtered by search (emoji label, simplified)
- Recently used section at top (localStorage key: 'kern-recent-emojis', max 8)
- Click emoji: calls onChange, updates recent emojis, closes popover

STEP 5 — Create src/components/ui/ColorPicker.tsx:
Props: value: string, onChange: (color: string) => void

Renders 12 color swatches in a flex-wrap row (no popover — just inline swatches).
Each swatch: 20px circle, cursor-pointer
Selected: ring-2 ring-offset-1 ring-[color]
Import COLLECTION_COLORS from constants.ts

STEP 6 — Create src/components/collection/CreateCollectionModal.tsx:
State: name, slug, icon (default '📦'), color (default first COLLECTION_COLORS), description, slugError

Auto-derive slug: useEffect on name change → setSlug(slugify(name)) if user hasn't manually edited slug
Track whether slug was manually edited (boolean flag, reset to false when name is cleared).

Async slug validation: on slug blur or change (debounced 400ms):
  supabase.from('collections').select('id').eq('user_id', userId).eq('slug', slug).maybeSingle()
  If result exists: setSlugError('This slug is already taken')
  Else: setSlugError(null)
  Also validate: /^[a-z0-9-]+$/ and length <= 60

Form layout:
- Row 1 (flex gap-3): EmojiPicker + ColorPicker
- Row 2: Input label="Collection name" (autofocus, required)
- Row 3: Input label="Slug" value={slug} onChange → set manual flag. Below: "kern.app/c/{slug}" preview in text-xs text-kern-text-3. Error shown if slugError.
- Row 4: <textarea> label="Description" (optional, 3 rows, same styling as Input)

Footer: <Button variant="ghost">Cancel</Button> <Button variant="primary" disabled={!name || !!slugError || isValidating}>Create collection</Button>

On submit: useCreateCollection.mutate({ name, slug, icon, color, description })
Show loading state on Create button during mutation.

STEP 7 — Create src/components/collection/EditCollectionModal.tsx:
Same form as Create but:
- Props include: collection: KernCollection (pre-fills all fields)
- Slug field: disabled, grayed out. Tooltip: "Slug cannot be changed after creation"
- Submit: calls useUpdateCollection.mutate({ id, name, icon, color, description })
- Button text: "Save changes"

STEP 8 — Create src/components/collection/DeleteCollectionDialog.tsx:
Use Radix AlertDialog (not regular Dialog — it's semantically different).
Props: collection: KernCollection, onClose: () => void

Shows:
- Collection icon (large, 32px) + collection name (bold)
- Warning: "This will permanently delete all fields, rows, and views in [name]. This cannot be undone."
- "Type the collection name to confirm:" label
- Text input: confirmation input
- Delete button: only enabled when inputValue === collection.name exactly (case sensitive)
- Cancel button

On confirm: useDeleteCollection.mutate({ id: collection.id })

STEP 9 — Wire up all modals in Sidebar.tsx:
Use local state in Sidebar (or pass from parent):
- createOpen state → CreateCollectionModal
- editTarget state → EditCollectionModal
- deleteTarget state → DeleteCollectionDialog

Pass appropriate handlers to SidebarCollectionItem:
- onEdit: setEditTarget(collection)
- onDelete: setDeleteTarget(collection)

"+" button and "New collection" button: setCreateOpen(true)

VERIFY: Create a collection → appears in sidebar with correct icon/color. Edit works. Delete works (with name confirmation). Slug is validated and unique.
```

---

### BLOCK 3: Fields Engine

---

#### TASK 1.7 — Fields Data Layer & Field Panel

**What it builds:** Full fields hook layer and the slide-in Field panel for adding/editing all 13 field types with their configuration UIs.
**Depends on:** Task 1.6
**Files created:** `src/hooks/useFields.ts`, `src/components/field/FieldPanel.tsx`, `src/components/field/FieldTypeGrid.tsx`, `src/components/field/FieldTypeIcon.tsx`, `src/components/field/SelectOptionsEditor.tsx`, `src/components/field/NumberFieldOptions.tsx`, `src/components/field/RelationFieldOptions.tsx`

**Cursor Prompt:**
```
Build the Fields engine for Kern — the full data layer and add/edit field panel.

STEP 1 — Create src/hooks/useFields.ts:

useFields(collectionId: string):
  queryKey: ['fields', collectionId]
  queryFn: supabase.from('fields').select('*').eq('collection_id', collectionId).order('sort_order', { ascending: true })
  staleTime: 120_000
  select: (data) => (data.data ?? []) as KernField[]
  enabled: !!collectionId

useCreateField():
  useMutation
  mutationFn receives: { collectionId: string, name: string, type: FieldType, options?: FieldOptions, isRequired?: boolean }
  Steps:
    1. Query max sort_order for this collection's fields
    2. Insert new field with sort_order = max + 1
  onSuccess: invalidate ['fields', collectionId]

useUpdateField():
  mutationFn receives: { id: string, name?: string, options?: FieldOptions, isRequired?: boolean, isHiddenByDefault?: boolean }
  Updates only provided fields
  onSuccess: invalidate ['fields', field.collection_id]

useDeleteField():
  mutationFn receives: { id: string, collectionId: string, slug: string }
  Steps:
    1. Delete from fields table
    2. Call RPC: supabase.rpc('remove_field_from_rows', { p_collection_id: collectionId, p_field_slug: slug })
  onSuccess: invalidate ['fields', collectionId], ['rows', collectionId]

useReorderFields():
  mutationFn receives: Array<{ id: string, sort_order: number }>
  Supabase upsert of sort_order values
  Optimistic update in onMutate: update cache immediately

STEP 2 — Create src/components/field/FieldTypeIcon.tsx:
Props: type: FieldType, size?: number (default 14), className?: string
Returns the correct Lucide icon component rendered at the given size:
  text → Type, rich_text → AlignLeft, number → Hash, date → Calendar, datetime → CalendarClock,
  boolean → CheckSquare2, select → ChevronDown, multi_select → ListChecks, url → Link,
  email → Mail, phone → Phone, relation → ArrowLeftRight, file → Paperclip

STEP 3 — Create src/components/field/FieldTypeGrid.tsx:
Props: value: FieldType, onChange: (type: FieldType) => void, disabled?: boolean

3-column grid of field type cards.
Each card:
- FieldTypeIcon + label + short description (from FIELD_TYPES constant)
- Selected: border-kern-accent bg-kern-accent/5 text-kern-accent
- Hover (not selected): bg-kern-surface-2
- Disabled: opacity-50 pointer-events-none

STEP 4 — Create src/components/field/SelectOptionsEditor.tsx:
Props: options: SelectOption[], onChange: (options: SelectOption[]) => void

Renders a sortable list of select options (dnd-kit).
Each option row (flex, h-8, gap-2):
- Drag handle: GripVertical, opacity-40
- Color swatch (16px circle, background = option.color): click opens a mini color picker (inline ColorPicker component using SELECT_COLORS)
- Label input: text-sm, inline borderless input, focus shows border
- Delete button: X icon, ghost, appears on hover

"+ Add option" button at bottom:
- Creates new option: { id: crypto.randomUUID(), label: 'Option', color: <random from SELECT_COLORS>, sort_order: options.length }
- Focuses the new option's label input after adding

STEP 5 — Create src/components/field/NumberFieldOptions.tsx:
Props: options: NumberFieldOptions | null, onChange: (opts: NumberFieldOptions) => void

Two rows:
- Row 1: "Unit" Input (text, placeholder "e.g. kg, hrs, %") + "Decimal places" select (0,1,2,3,4)
- Row 2: "Show as progress bar" toggle switch (Radix Toggle or simple checkbox with label)
  If true: "Min" number input + "Max" number input appear below

STEP 6 — Create src/components/field/RelationFieldOptions.tsx:
Props: options: RelationFieldOptions | null, onChange: (opts: RelationFieldOptions) => void, currentCollectionId: string

Uses useCollections() to get all collections.
"Target collection" Select: lists all collections EXCEPT current one. Radix Select component.
"Allow multiple links" toggle (switches between 'single' and 'multiple' display mode).

STEP 7 — Create src/components/field/FieldPanel.tsx:
A fixed right-side panel (not a modal).
Props: mode: 'create' | 'edit', collectionId: string, field?: KernField, onClose: () => void

Position: fixed, right 0, top 48px, bottom 0, width 360px
Animation: translate-x-full → translate-x-0, 200ms ease-out
Backdrop: fixed inset-0 bg-black/20 (behind panel), onClick closes panel
z-index: 30 (below row editor which is 35, below modals which are 50)

Header: "Add field" / "Edit field" title + X close button
Scrollable body:

Section 1 — Field name:
  Input label="Field name", autofocus in create mode

Section 2 — Field type (create mode only, hidden in edit mode):
  FieldTypeGrid, current selection

Section 3 — Type-specific options (shown based on selected type):
  select/multi_select → SelectOptionsEditor
  number → NumberFieldOptions  
  relation → RelationFieldOptions
  All other types: no extra options section

Section 4 — Settings:
  "Required" toggle (Radix-style checkbox with label "This field is required")

Footer (sticky bottom):
  <Button variant="ghost" onClick={onClose}>Cancel</Button>
  <Button variant="primary" onClick={handleSubmit} loading={isLoading}>
    {mode === 'create' ? 'Add field' : 'Save changes'}
  </Button>

handleSubmit:
  Create mode: useCreateField.mutate({ collectionId, name, type, options, isRequired })
  Edit mode: useUpdateField.mutate({ id: field.id, name, options, isRequired })
  onSuccess: onClose()

VERIFY: Open a collection, click "+ Add field", field panel slides in. Add a text field, a select field with options, a number field with unit. Fields appear as columns in the (placeholder) collection page. Edit and delete fields via the panel.
```

---

### BLOCK 4: Rows Engine

---

#### TASK 1.8 — Rows Hook Layer, Collection Header & View Tabs

**What it builds:** Full rows and views hook layer, the Collection header component with view tabs, filter/sort/fields buttons (UI ready), and active view state management.
**Depends on:** Task 1.7
**Files created:** `src/hooks/useRows.ts`, `src/hooks/useViews.ts`, `src/components/collection/CollectionHeader.tsx`, `src/components/collection/CollectionViewTabs.tsx`, `src/components/collection/CollectionActionsMenu.tsx`, `src/components/views/ViewFilterBar.tsx`, `src/components/views/ViewSortBar.tsx`, `src/components/views/ViewFieldsMenu.tsx`, updated `src/pages/CollectionPage.tsx`

**Cursor Prompt:**
```
Build the rows and views data layer, and the full Collection header with view tabs for Kern.

STEP 1 — Create src/hooks/useViews.ts:

useViews(collectionId: string):
  queryKey: ['views', collectionId]
  queryFn: supabase.from('views').select('*').eq('collection_id', collectionId).order('sort_order', { ascending: true })
  staleTime: 120_000
  select: (data) => (data.data ?? []) as KernView[]
  enabled: !!collectionId

useCreateView():
  mutationFn receives: { collectionId: string, type: ViewType, name?: string }
  Inserts view with:
    - name: provided or default ("Table view", "Kanban view", etc.)
    - type: provided
    - config: DEFAULT_VIEW_CONFIG from constants.ts
    - sort_order: max existing + 1
  onSuccess: invalidate ['views', collectionId]

useUpdateView():
  mutationFn receives: { id: string, config?: Partial<ViewConfig>, name?: string }
  For config updates: MERGE the provided config with existing (not replace)
  Pattern: use jsonb_set or fetch-then-merge on client
  Optimistic update: update the view in cache immediately
  onSuccess: invalidate ['views', collectionId]

useDeleteView():
  mutationFn receives: { id: string, collectionId: string }
  onSuccess: invalidate ['views', collectionId]

STEP 2 — Create src/hooks/useRows.ts:

useRows(collectionId: string, viewConfig?: ViewConfig, fields?: KernField[]):
  queryKey: ['rows', collectionId, viewConfig?.filters, viewConfig?.sorts]
  Note: don't include the full viewConfig in the key — too much. Just filters and sorts.
  
  queryFn: 
    let query = supabase.from('rows').select('*').eq('collection_id', collectionId).order('sort_order', { ascending: true })
    Push simple eq filters to Supabase (for performance):
    for (const filter of viewConfig?.filters ?? []) {
      if (filter.operator === 'eq') query = query.eq(`data->>'${filter.field_slug}'`, String(filter.value))
    }
    return query
  
  select: (result) => {
    // Client-side apply all filters and sorts after DB result comes back
    // These functions will be built in Task 1.12 — for now just return raw data
    return (result.data ?? []) as KernRow[]
  }
  staleTime: 10_000

useRow(rowId: string):
  queryKey: ['row', rowId]
  queryFn: supabase.from('rows').select('*').eq('id', rowId).single()
  staleTime: 0 (always fresh)
  enabled: !!rowId

useCreateRow():
  mutationFn receives: { collectionId: string, data?: Record<string, unknown> }
  onMutate (optimistic): generate a temp UUID, add a placeholder row to the ['rows', collectionId] cache
  mutationFn: insert into rows table
  onError: rollback to previousRows from context
  onSettled: invalidate ['rows', collectionId]
  Returns the created row (important — callers need the real ID)

useUpdateRow():
  mutationFn receives: { id: string, collectionId: string, data: Record<string, unknown> }
  The data object is a PARTIAL update — merge with existing row.data on client and in DB:
    DB: UPDATE rows SET data = data || $1, updated_at = now() WHERE id = $2
    Use: supabase.from('rows').update({ data: mergedData }).eq('id', id)
    But first fetch current data from cache, merge, then send merged result
  onMutate (optimistic): update row in cache immediately
  onError: rollback

useDeleteRow():
  mutationFn receives: { id: string, collectionId: string }
  onMutate (optimistic): remove row from cache
  mutationFn: delete from rows
  onError: rollback
  onSettled: invalidate ['rows', collectionId]

useDeleteRows():
  mutationFn receives: { ids: string[], collectionId: string }
  supabase.from('rows').delete().in('id', ids)
  onSuccess: invalidate ['rows', collectionId]

useDuplicateRow():
  mutationFn receives: { row: KernRow }
  Insert new row with same data, sort_order = original.sort_order + 0.5
  onSuccess: invalidate ['rows', row.collection_id]

STEP 3 — Create src/components/collection/CollectionViewTabs.tsx:
Props: views: KernView[], activeViewId: string, onViewChange: (viewId: string) => void, collectionId: string

Render as a flex row of tabs (not Radix Tabs — custom implementation for more control):
Each view tab:
  - View type icon (from a VIEW_TYPE_ICONS map: table=Table2, kanban=Columns, calendar=Calendar, gallery=LayoutGrid, list=List, custom=Code2)
  - View name (truncated max 120px)
  - Active: border-b-2 border-kern-accent text-kern-text font-medium
  - Inactive: text-kern-text-2 hover:text-kern-text

Double-click active tab: show inline rename input (replaces the tab text, blur/Enter to save via useUpdateView)

"+ Add view" tab at the end (always last):
  Click: opens an AddViewPopover (Popover component with list of view type options)
  Each option: view icon + view name → calls useCreateView({ collectionId, type })

STEP 4 — Create src/components/collection/CollectionActionsMenu.tsx:
Triggered by ⋯ button in CollectionHeader.
DropdownMenu items:
  - "Edit collection" → opens EditCollectionModal
  - "Connect live source" (only if !is_live_source) → opens ConnectLiveSourceModal (placeholder for Phase 2)
  - "Sync now" (only if is_live_source) → calls supabase.functions.invoke('sync-' + live_source_type, ...)
  - Separator
  - "Export as CSV" → (placeholder for Task 3.4)
  - Separator  
  - "Delete collection" (text-kern-danger) → opens DeleteCollectionDialog

STEP 5 — Create src/components/views/ViewFilterBar.tsx:
Props: fields: KernField[], viewConfig: ViewConfig, onUpdateConfig: (partial: Partial<ViewConfig>) => void

"Filter" button (Filter icon + count badge if filters.length > 0)
Button styling: if filters.length > 0 → bg-kern-accent/10 border-kern-accent/30 text-kern-accent

Popover content (320px wide):
Header: "Filters" text + "Clear all" button (only if filters.length > 0, onClick: onUpdateConfig({ filters: [] }))

Filter rule list:
Each FilterRule row (flex, gap-2, mb-2):
  - Field selector: Radix Select, options = all collection fields with FieldTypeIcon
  - Operator selector: Radix Select, options depend on selected field type (use FILTER_OPERATORS_BY_FIELD_TYPE from constants.ts — leave this as a TODO for now, just show "equals" for all)
  - Value input: text input for now (will be enhanced in Task 1.12)
  - Delete (X) button: removes this filter rule
  All changes: call onUpdateConfig({ filters: updatedFilters })

"+ Add filter" button: adds new FilterRule with { id: uuid(), field_slug: fields[0]?.slug, operator: 'contains', value: '' }

STEP 6 — Create src/components/views/ViewSortBar.tsx:
Same pattern as FilterBar but for sorts.
Sort rule row:
  - Field selector
  - Direction toggle: "A→Z" / "Z→A" button pair (or asc/desc)
  - Drag handle (dnd-kit sortable to reorder priority)
  - Delete button
"+ Add sort" button

STEP 7 — Create src/components/views/ViewFieldsMenu.tsx:
"Fields" button (Columns icon)
Popover content:
  List of all collection fields with:
  - FieldTypeIcon + field name
  - Radix Checkbox: checked if NOT in viewConfig.hidden_fields
  - Toggle: if hiding, add to hidden_fields array. If showing, remove.
  - onChange: onUpdateConfig({ hidden_fields: newArray })
Drag-to-reorder field order within this menu (updates fields sort_order via useReorderFields)

STEP 8 — Create src/components/collection/CollectionHeader.tsx:
Props: collection, fields, views, activeView, onViewChange

Two rows:
Row 1 (h-12, px-6, flex items-center gap-3, border-b border-kern-surface-2):
  Left: [collection icon] [collection name, font-semibold]
  Middle: [Live source badge if is_live_source — placeholder component]
  Right: CollectionActionsMenu

Row 2 (h-10, px-4, flex items-center, border-b border-kern-border):
  Left: CollectionViewTabs
  Right (ml-auto, flex gap-1):
    ViewFilterBar, ViewSortBar, ViewFieldsMenu, ViewOptionsMenu (placeholder button for now)

STEP 9 — Update src/pages/CollectionPage.tsx:
Full collection page using all hooks:
- useCollection(slug)
- useFields(collection?.id)
- useViews(collection?.id)
- Manage activeViewId in state, sync with URL param ?view=:viewId
- If no views exist after loading: call useCreateView({ collectionId, type: 'table', name: 'Table' }) automatically
- Render CollectionHeader
- Below header: placeholder "View content goes here" (TableView comes in Task 1.9)
- Pass active view's config to filter/sort buttons via onUpdateConfig → useUpdateView

VERIFY: Collection page shows full header with view tabs. Adding a view via "+ Add view" works. Filter/sort/fields buttons open popovers. View tab renaming works.
```

---

#### TASK 1.9 — Table View

**What it builds:** Complete Table View — TanStack Table + TanStack Virtual, all cell types, column resize, sorting, bulk selection, inline add row.
**Depends on:** Task 1.8
**Files created:** All `src/components/cells/*.tsx`, `src/components/views/TableView/TableView.tsx`, `src/components/views/TableView/TableColumnHeader.tsx`, `src/components/row/BulkActionBar.tsx`, `src/components/row/RowContextMenu.tsx`

**Cursor Prompt:**
```
Build the complete Kern Table View using TanStack Table v8 + TanStack Virtual.

STEP 1 — Create all cell components in src/components/cells/:

First create src/components/cells/CellRenderer.tsx:
Props: value: unknown, field: KernField, rowId: string, isEditing: boolean, onStartEdit: () => void, onSave: (value: unknown) => void, onCancel: () => void
Switch on field.type and render the correct cell component.

Create each cell (all share the same props interface above):

TextCell.tsx:
  Display: <span className="truncate text-sm">{String(value ?? '')}</span>
  Edit: <input autoFocus className="w-full h-full text-sm outline-none bg-transparent" value={editValue} onChange onKeyDown (Enter=save, Escape=cancel) onBlur=save />

NumberCell.tsx:
  Display: right-aligned number + unit suffix from field.options
  If show_as_progress: render a progress bar div (width = (value/max)*100 + '%', bg-kern-accent, h-1.5 rounded-full, gray track)
  Edit: number input, right-aligned

DateCell.tsx:
  Display: formatRelativeTime-style but for dates — use date-fns format(date, 'MMM d, yyyy')
  Show "Today", "Yesterday", "Tomorrow" for those cases
  Edit: Popover with a simple inline calendar:
    - Month/year header with < > navigation buttons
    - 7-column grid (Su Mo Tu We Th Fr Sa)
    - Day buttons, highlight today, highlight selected
    - Click day: save the YYYY-MM-DD string, close popover

BooleanCell.tsx:
  Radix Checkbox, always interactive (no separate edit mode)
  Centered in cell
  onChange: immediately call onSave(newValue)

SelectCell.tsx:
  Display: colored pill (bg = option.color + '26', text = option.color, text-xs font-medium px-2 py-0.5 rounded-full)
  If no value: empty
  Edit: Popover with searchable option list. Each option shown as pill. Click to select and save.

MultiSelectCell.tsx:
  Display: flex flex-wrap gap-1 — multiple pills (same style as SelectCell), overflow "+N more"
  Edit: Popover with checkbox list of options + search

UrlCell.tsx:
  Display: text-kern-accent underline truncate, ExternalLink icon (12px), Cmd+Click opens in new tab
  Edit: text input

EmailCell.tsx:
  Display: text-sm truncate, click opens mailto: link
  Edit: email input

PhoneCell.tsx:
  Display: text-sm, click opens tel: link
  Edit: text input

RelationCell.tsx:
  Display: flex flex-wrap gap-1 — pills with related row name (text-xs border border-kern-border rounded px-2 py-0.5)
  Click pill: appStore.openRow(relatedRowId, targetCollectionId)
  Edit: opens RelationPicker popover (placeholder for now — full impl in Task 1.10)
  For now: display only, no edit

FileCell.tsx:
  Display: if files exist: file count badge + first file name (truncated)
  If no files: "No files" in kern-text-3
  Edit: placeholder for Phase 2

STEP 2 — Create src/components/views/TableView/TableColumnHeader.tsx:
Props: field: KernField, isSorted: false | 'asc' | 'desc', onSort: () => void, width: number, onResizeStart: (e: React.MouseEvent) => void, onEdit: () => void, onHide: () => void, onDelete: () => void, onAddFieldBefore: () => void, onAddFieldAfter: () => void

Display: flex items-center gap-1.5 h-full px-2 text-xs font-medium text-kern-text-2
FieldTypeIcon + field name + sort indicator (ArrowUp/ArrowDown 12px, only shown when sorted)
Right-click or hover → ⋯ button → DropdownMenu with all actions

Resize handle: absolute right edge, width 4px, height 100%, cursor-col-resize
onMouseDown: calls onResizeStart(e)

Sort on click of the header area (not on ⋯ button, not on resize handle)

STEP 3 — Create src/components/views/TableView/TableView.tsx:
This is the biggest component. Build it carefully.

Setup:
- Props: rows: KernRow[], fields: KernField[], viewConfig: ViewConfig, collectionId: string, collection: KernCollection
- Get useUpdateRow, useCreateRow, useDeleteRow, useDuplicateRow from hooks
- Local state: editingCell: { rowId: string, fieldSlug: string } | null, selectedRowIds: Set<string>, columnWidths: Record<string, number>

TanStack Table setup:
  const table = useReactTable({
    data: rows,
    columns: buildColumns(fields, viewConfig), // see below
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  })

buildColumns function:
  Returns ColumnDef<KernRow>[] array:
  - Column 0: checkbox column (id: 'select', size: 40, enableResizing: false)
    Header: Radix Checkbox (checked if all rows selected, indeterminate if some)
    Cell: Radix Checkbox for that row, stop propagation on click
  - For each visible field (not in viewConfig.hidden_fields, sorted by sort_order):
    id: field.slug, accessorFn: (row) => row.data[field.slug]
    size: viewConfig.table_column_widths[field.slug] ?? 200
    header: TableColumnHeader with sort state
    cell: CellRenderer with editing state management
  - Last: "+ Add field" column (fixed width 120px, header shows "+ Add field" button)

Virtual scrolling:
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: rows.length + 1, // +1 for "add row"
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

Render structure:
  <div ref={parentRef} className="overflow-auto h-full">
    {/* Sticky header */}
    <div className="sticky top-0 z-10 bg-kern-bg border-b border-kern-border flex">
      {table.getHeaderGroups()[0].headers.map(header => ...)}
    </div>
    
    {/* Virtual rows */}
    <div style={{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => {
        if (virtualRow.index === rows.length) {
          // "Add row" row
          return <div key="add-row" style={virtualStyle} className="flex items-center h-9 px-10 text-sm text-kern-text-3 cursor-pointer hover:bg-kern-surface" onClick={handleAddRow}>
            + Add row
          </div>
        }
        const row = table.getRowModel().rows[virtualRow.index]
        return <TableRow key={row.id} row={row} virtualRow={virtualRow} ... />
      })}
    </div>
  </div>

Create TableRow inline component (or separate file):
  Props: row, virtualRow, editingCell, onCellClick, onRowClick
  - div with role="row", absolute positioning (virtualRow style)
  - Height: 36px, border-bottom border-kern-surface-2, flex
  - Hover: bg-kern-surface group
  - Right-click: RowContextMenu
  - Click (not on cell): appStore.openRow(row.original.id, collectionId)
  - On hover: show expand button (↗ ArrowUpRight, 12px) on right side → opens row editor

Inline add row:
  handleAddRow: useCreateRow.mutateAsync({ collectionId, data: {} })
  After mutation: open the new row in the editor (appStore.openRow)

Column resize:
  TanStack Table handles this via columnResizing feature.
  After resize: save width to viewConfig via useUpdateView.

Empty states:
  if rows.length === 0 and viewConfig.filters.length === 0: EmptyState
  if rows.length === 0 and filters exist: "No rows match filters" EmptyState

BulkActionBar: render when selectedRowIds.size > 0

STEP 4 — Create src/components/row/BulkActionBar.tsx:
Fixed bottom bar (fixed bottom-4 left-1/2 -translate-x-1/2, z-50)
White card: rounded-kern-xl border border-kern-border shadow-xl px-4 py-2 flex items-center gap-4

"[N] rows selected" text
"Duplicate" button → useDuplicateRow for each selected row
"Delete" button (danger) → confirmation: toast("Delete N rows?", { action: { label: 'Confirm', onClick: deleteAll } })
"Clear" button → clear selectedRowIds

STEP 5 — Create src/components/row/RowContextMenu.tsx:
Radix ContextMenu.
Props: children, rowId, collectionId, onDelete

Items:
- "Open" → appStore.openRow(rowId, collectionId)
- "Duplicate" → useDuplicateRow
- Separator
- "Delete" → useDeleteRow (immediate, with sonner toast undo for 5s)

STEP 6 — Wire TableView into CollectionPage:
When activeView.type === 'table':
  <TableView rows={rows} fields={fields} viewConfig={activeView.config} collectionId={collection.id} collection={collection} />

VERIFY: Table renders rows. Clicking a cell enters edit mode. Pressing Tab moves to next cell. Enter confirms. Checkbox selects rows. BulkActionBar appears. Inline "add row" works. Column resize works. Right-click context menu works.
```

---

#### TASK 1.10 — Row Editor Panel

**What it builds:** The full slide-in right panel for editing all field types on a row, with relations, referenced-by, and optimistic save.
**Depends on:** Task 1.9
**Files created:** `src/hooks/useRelations.ts`, `src/components/row/RowEditorPanel.tsx`, `src/components/row/RelationPicker.tsx`, `src/components/row/RelationPill.tsx`, `src/components/row/ReferencedBySection.tsx`

**Cursor Prompt:**
```
Build the Row Editor Panel for Kern — the slide-in right panel that opens when expanding any row.

STEP 1 — Create src/hooks/useRelations.ts:

useRelations(rowId: string, fields: KernField[]):
  const relationFields = fields.filter(f => f.type === 'relation')
  For each relation field:
    Query row_relations where source_row_id = rowId AND field_id = field.id
    Fetch target rows
  Return: Record<fieldId, KernRow[]>
  
  Query key: ['relations', rowId]
  Combine into a single query:
    supabase.from('row_relations').select('*, target_row:rows!target_row_id(*)').eq('source_row_id', rowId)
  Then group by field_id.

useAddRelation():
  mutationFn receives: { sourceRowId: string, targetRowId: string, fieldId: string, userId: string }
  Insert into row_relations
  onSuccess: invalidate ['relations', sourceRowId]

useRemoveRelation():
  mutationFn receives: { id: string, sourceRowId: string }
  Delete from row_relations by id
  onSuccess: invalidate ['relations', sourceRowId]

useReversedRelations(rowId: string):
  Finds all rows that LINK TO this row (i.e., row_relations where target_row_id = rowId)
  Fetches the source rows with their collection info
  Query: supabase.from('row_relations').select('*, source_row:rows!source_row_id(*), field:fields(*)').eq('target_row_id', rowId)
  Returns: Array<{ relation: KernRowRelation, sourceRow: KernRow, field: KernField }>

STEP 2 — Create src/components/row/RelationPill.tsx:
Props: row: KernRow, fields: KernField[], collectionId: string, onRemove?: () => void, clickable?: boolean

Small pill: flex items-center gap-1 px-2 py-0.5 text-xs border border-kern-border rounded-kern-sm bg-kern-surface group cursor-pointer
Content: [collection icon if available] [primary field value, truncated 120px]

Hover (if onRemove): show X button (8px) replacing the → icon
Click (if clickable): appStore.openRow(row.id, collectionId)

STEP 3 — Create src/components/row/RelationPicker.tsx:
Props: field: KernField, currentRelations: KernRow[], onAdd: (targetRowId: string) => void, onRemove: (relationId: string) => void

Display section: flex-wrap gap-1 of RelationPills + "+ Link" button

Popover (opens on "+ Link" click, width 280px):
  - Search input (Search icon, autofocus)
  - Scrollable list of rows from target collection:
    useRows(targetCollectionId) where targetCollectionId = (field.options as RelationFieldOptions).target_collection_id
    Filter by search input (primary field value contains search)
  - Each item in list:
    [primary field value] [checkmark if already linked]
    Click: if already linked → onRemove, else → onAdd
  - Empty state: "No rows in [collection] yet"

STEP 4 — Create src/components/row/ReferencedBySection.tsx:
Props: rowId: string

Uses useReversedRelations(rowId).
Radix Collapsible — collapsed by default.
Trigger: "Referenced by ([N])" text (kern-text-2 text-sm, chevron icon)

Inside: groups by collection.
  For each collection group:
    Collection icon + Collection name header (text-xs text-kern-text-3)
    List of RelationPills for each source row

STEP 5 — Create src/components/row/RowEditorPanel.tsx:
This is the main panel component.

Controlled by appStore.openRowId and appStore.openRowCollectionId.

Position: fixed right-0 top-[48px] bottom-0 w-[480px] bg-kern-bg border-l border-kern-border z-35
Animation: translate-x-full → translate-x-0, 200ms ease-out
Backdrop: fixed inset-0 bg-black/20 z-30 (only when panel is open, onClick calls appStore.closeRow())

Data fetching:
  - useRow(openRowId)
  - useFields(openRowCollectionId)
  - useRelations(openRowId, fields)
  - useCollection by id (need to add useCollectionById hook: query by id not slug)

Show full skeleton while loading.

Layout:
  Header (h-12 px-4 border-b flex items-center gap-2):
    [Collection icon] [Collection name] text-sm text-kern-text-2
    [short row id, text-kern-text-3 text-xs ml-auto]
    [X close button]
  
  Sub-header (px-4 py-2 border-b text-xs text-kern-text-3):
    "Created [formatRelativeTime(row.created_at)]"
    "· Updated [formatRelativeTime(row.updated_at)]"
  
  Scrollable body (overflow-y-auto flex-1 px-4 py-4):
    For each field in fields (sorted by sort_order):
      Field section:
        Label row: FieldTypeIcon (12px) + field.name (text-xs font-medium text-kern-text-2) + required asterisk (if is_required)
        Value editor: (see below per type)
        mb-5 gap between fields
    
    ReferencedBySection at bottom
  
  Footer (h-12 px-4 border-t flex items-center):
    <Button variant="danger" size="sm" onClick={handleDelete}>Delete row</Button>
    Delete: useDeleteRow, then appStore.closeRow()

Field editors in row editor (more space than cells):

text: <input className="w-full text-sm border border-kern-border rounded-kern-md px-3 py-2 bg-kern-bg focus:ring-2 focus:ring-kern-accent/30 focus:border-kern-accent outline-none" />

rich_text: Simple Tiptap editor (bold, italic, unordered list, links only)
  Use @tiptap/react + @tiptap/starter-kit
  Basic toolbar: B I • ∞ icons
  Min-height: 80px, border, rounded

number: <input type="number" /> + unit label to the right

date: same calendar popover as DateCell

datetime: date input + time input side by side

boolean: Large Radix Checkbox + "True" / "False" label beside it

select: flex flex-wrap gap-2 of clickable option pills (full options list, selected = filled, unselected = outlined)

multi_select: same as select but multiple can be active simultaneously

url: <input type="url" /> + <Button size="sm" variant="ghost">Open ↗</Button>
email: <input type="email" /> + <Button size="sm" variant="ghost">Send mail</Button>
phone: <input type="tel" /> + <Button size="sm" variant="ghost">Call</Button>

relation: <RelationPicker field={field} currentRelations={relationsData[field.id] ?? []} onAdd={handleAddRelation} onRemove={handleRemoveRelation} />

file: Placeholder div "File upload coming soon" (full implementation in Task 2.5)

Save behavior for all editors:
  On change/blur/click: call useUpdateRow.mutate({ id: row.id, collectionId, data: { [field.slug]: newValue } })
  Optimistic — UI updates immediately.
  Show "Saving..." → "Saved ✓" in the sub-header area (500ms debounce before saving text fields)

STEP 6 — Add useCollectionById hook to useCollections.ts:
useCollectionById(id: string | null): TanStack Query fetching by id not slug.

STEP 7 — Update AppShell to render RowEditorPanel for real:
Replace the placeholder with the actual RowEditorPanel component.

VERIFY: Click any row in table view → panel slides in from right. All field types editable. Relations can be added/removed. Referenced-by section shows reverse relations. Delete works. Panel closes on backdrop click or Escape.
```

---

### BLOCK 5: Kanban View

---

#### TASK 1.11 — Kanban View

**What it builds:** Full Kanban view with dnd-kit drag between columns and within columns, column collapse, quick-add cards.
**Depends on:** Task 1.10
**Files created:** `src/components/views/KanbanView/KanbanView.tsx`, `src/components/views/KanbanView/KanbanColumn.tsx`, `src/components/views/KanbanView/KanbanCard.tsx`

**Cursor Prompt:**
```
Build the complete Kanban view for Kern using @dnd-kit.

STEP 1 — Create src/components/views/KanbanView/KanbanCard.tsx:
Props: row: KernRow, fields: KernField[], viewConfig: ViewConfig, isDragging?: boolean

Use @dnd-kit/sortable useSortable({ id: row.id })

Card: white bg, rounded-kern-lg, border border-kern-border, p-3, shadow-sm
Apply transform + transition from useSortable
isDragging: opacity-0 (the original position becomes invisible while dragging)

Content:
  Title: primary field value (text-sm font-medium, 2-line clamp)
  Secondary fields (from viewConfig.gallery_card_fields, max 3 visible):
    For each field slug: show field name in text-kern-text-3 text-xs + field value in text-kern-text text-xs
    Use CellRenderer in display-only mode (isEditing=false, onStartEdit=noop, onSave=noop)

Hover: shadow-md, show drag handle (GripVertical, opacity-0 group-hover:opacity-40) at top-left
Click (not drag): appStore.openRow(row.id, collectionId)

DragOverlay (rendered in KanbanView):
  Show a copy of the card scaled to 1.03, shadow-xl, rotate slightly (1deg)

STEP 2 — Create src/components/views/KanbanView/KanbanColumn.tsx:
Props: option: SelectOption | null, rows: KernRow[], fields: KernField[], viewConfig: ViewConfig, groupByField: KernField, collectionId: string, isCollapsed: boolean, onToggleCollapse: () => void

SortableContext for this column's row ids (verticalListSortingStrategy).

Header (h-10, flex items-center gap-2):
  Colored dot (8px circle, option.color or gray if null)
  Option label or "No [fieldName]" if null
  Count badge: text-xs text-kern-text-3
  Collapse button: ChevronLeft icon, onClick=onToggleCollapse

When collapsed:
  Column width: 40px
  Header rotated 90 degrees (CSS: writing-mode: vertical-rl)
  No cards shown

When expanded (width: 280px):
  Body: flex flex-col gap-2 pt-2
    KanbanCard for each row (wrapped in SortableItem)
    useDroppable({ id: option?.id ?? 'no-status' }) on the body div
    Empty column: "Drop cards here" placeholder div (dashed border, h-20)
  
  Footer:
    "+ Add card" button (ghost, full width, Plus icon)
    onClick: useCreateRow.mutate({ collectionId, data: { [groupByField.slug]: option?.id ?? null } })
    After creation: appStore.openRow(newRow.id, collectionId)

STEP 3 — Create src/components/views/KanbanView/KanbanView.tsx:
Props: rows, fields, viewConfig, collectionId, collection

State: collapsedColumns: string[] (synced with viewConfig.kanban_collapsed_columns), activeId: string | null (for drag overlay)

No group-by field guard:
  const groupByField = fields.find(f => f.slug === viewConfig.group_by_field)
  If !groupByField:
    Show prompt: "Select a field to group by"
    Radix Select with only select-type fields
    On select: useUpdateView({ id: activeView.id, config: { group_by_field: fieldSlug } })
    If no select fields at all: EmptyState "Add a Select field to use Kanban view" + "Add Select field" button

Column building:
  const options = (groupByField?.options as SelectFieldOptions)?.items ?? []
  Columns: [{ option: null, id: 'no-status' }, ...options.map(o => ({ option: o, id: o.id }))]
  For each column, filter rows where row.data[groupByField.slug] === option?.id (null column = rows where it's null or undefined)

DndContext setup:
  sensors: useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  onDragStart: setActiveId(event.active.id as string)
  onDragEnd: handleDragEnd
  onDragCancel: setActiveId(null)

handleDragEnd:
  const { active, over } = event
  if (!over) return setActiveId(null)
  
  const activeRow = rows.find(r => r.id === active.id)
  if (!activeRow) return
  
  // Determine target column
  const overColumn = columns.find(c => c.id === over.id || c.rows.some(r => r.id === over.id))
  const targetOptionId = overColumn?.option?.id ?? null
  const currentOptionId = activeRow.data[groupByField.slug] as string | null ?? null
  
  if (targetOptionId !== currentOptionId) {
    // Moving between columns: update the select field value
    useUpdateRow.mutate({ id: activeRow.id, collectionId, data: { [groupByField.slug]: targetOptionId } })
  } else {
    // Reordering within column: update sort_order
    // Calculate new sort_order based on position
    // ... implement arrayMove logic
  }
  setActiveId(null)

Render:
  <DndContext ...>
    <div className="flex gap-4 overflow-x-auto h-full p-4">
      {columns.map(col => (
        <KanbanColumn key={col.id} option={col.option} rows={rowsByColumn[col.id]} ... />
      ))}
    </div>
    <DragOverlay>
      {activeId ? <KanbanCard row={rows.find(r => r.id === activeId)} ... isDragging={false} /> : null}
    </DragOverlay>
  </DndContext>

STEP 4 — Add Kanban-specific options to ViewOptionsMenu:
  "Group by field": Radix Select of select-type fields → useUpdateView
  "Card fields": Multi-select of all fields → updates gallery_card_fields in config

STEP 5 — Wire into CollectionPage:
  activeView.type === 'kanban' → <KanbanView ... />

VERIFY: Kanban renders columns. Cards drag between columns (updates the select field). Cards drag within column. Columns collapse. Quick-add creates a card in the right column. Empty state shown if no select fields.
```

---

### BLOCK 6: Filters, Sorts, Command Palette, Dashboard

---

#### TASK 1.12 — Full Filters & Sorts Implementation

**What it builds:** Working filter and sort logic that actually operates on row data, all operators per field type, real-time filtering as rules change.
**Depends on:** Task 1.11
**Files created:** `src/lib/field-operators.ts`, `src/lib/apply-filters.ts`, `src/lib/apply-sorts.ts`, updated `src/hooks/useRows.ts`, updated `src/components/views/ViewFilterBar.tsx`, updated `src/components/views/ViewSortBar.tsx`

**Cursor Prompt:**
```
Make filters and sorts actually work in Kern. Wire the filter/sort logic to the row data pipeline.

STEP 1 — Create src/lib/field-operators.ts:
Export OPERATORS_BY_FIELD_TYPE: Record<FieldType, Array<{ operator: FilterOperator, label: string }>>

Use these exact operator sets:
  text, rich_text: [contains, not_contains, eq, neq, starts_with, ends_with, is_empty, is_not_empty]
  number: [eq, neq, gt, lt, gte, lte, is_empty, is_not_empty]
  date, datetime: [eq, before, after, gte, lte, is_empty, is_not_empty]
  boolean: [is_true, is_false]
  select: [eq, neq, is_empty, is_not_empty]
  multi_select: [contains, not_contains, is_empty, is_not_empty]
  url, email, phone: [contains, is_empty, is_not_empty]
  relation: [is_empty, is_not_empty]
  file: [is_empty, is_not_empty]

STEP 2 — Create src/lib/apply-filters.ts:
Export applyFilters(rows: KernRow[], filters: FilterRule[], fields: KernField[]): KernRow[]

If filters is empty: return rows unchanged.

For each row: evaluate ALL filter rules (AND logic). If any rule fails, exclude the row.

Implementation for each operator:
  Get value = row.data[filter.field_slug]
  
  is_empty: value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  is_not_empty: !isEmpty(value)
  is_true: value === true
  is_false: value === false || !value
  eq: String(value).toLowerCase() === String(filter.value).toLowerCase() (for text), or value === filter.value (for number/boolean)
  neq: !eq(...)
  contains (text): String(value ?? '').toLowerCase().includes(String(filter.value).toLowerCase())
  not_contains: !contains(...)
  starts_with: String(value ?? '').toLowerCase().startsWith(String(filter.value).toLowerCase())
  ends_with: String(value ?? '').toLowerCase().endsWith(String(filter.value).toLowerCase())
  gt: Number(value) > Number(filter.value)
  lt: Number(value) < Number(filter.value)
  gte: Number(value) >= Number(filter.value)
  lte: Number(value) <= Number(filter.value)
  before (date): new Date(String(value)) < new Date(String(filter.value))
  after (date): new Date(String(value)) > new Date(String(filter.value))
  on (date): same date string comparison after normalizing to YYYY-MM-DD
  
  For select 'eq': compare option ID. If filter.value might be a label, try to resolve label to ID.
  For multi_select 'contains': (value as string[]).includes(filter.value as string)

STEP 3 — Create src/lib/apply-sorts.ts:
Export applySorts(rows: KernRow[], sorts: SortRule[], fields: KernField[]): KernRow[]

If sorts is empty: return rows unchanged.

Apply sorts in order (first sort = primary):
  Use Array.sort with a comparator that chains sorts:
  
  compareRows(a, b, sorts, fields):
    for each sort:
      const field = fields.find(f => f.slug === sort.field_slug)
      const aVal = a.data[sort.field_slug]
      const bVal = b.data[sort.field_slug]
      
      // Null values always last
      if (aVal == null && bVal == null) continue
      if (aVal == null) return 1
      if (bVal == null) return -1
      
      let comparison = 0
      if (field?.type === 'number') comparison = Number(aVal) - Number(bVal)
      else if (field?.type === 'date' || field?.type === 'datetime') comparison = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime()
      else if (field?.type === 'boolean') comparison = (aVal ? 1 : 0) - (bVal ? 1 : 0)
      else if (field?.type === 'select') {
        const options = (field.options as SelectFieldOptions)?.items ?? []
        const aLabel = options.find(o => o.id === aVal)?.label ?? String(aVal)
        const bLabel = options.find(o => o.id === bVal)?.label ?? String(bVal)
        comparison = aLabel.localeCompare(bLabel)
      }
      else comparison = String(aVal).localeCompare(String(bVal))
      
      if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison
    return 0

STEP 4 — Update src/hooks/useRows.ts:
Add fields as a parameter to useRows: useRows(collectionId, viewConfig, fields)
Update the select function in the query:
  select: (result) => {
    const rawRows = (result.data ?? []) as KernRow[]
    const filtered = applyFilters(rawRows, viewConfig?.filters ?? [], fields ?? [])
    const sorted = applySorts(filtered, viewConfig?.sorts ?? [], fields ?? [])
    return sorted
  }

Update the query key to include a hash of filters/sorts (not the full objects):
  queryKey: ['rows', collectionId, JSON.stringify(viewConfig?.filters), JSON.stringify(viewConfig?.sorts)]

STEP 5 — Update ViewFilterBar.tsx to use proper operators:
Field selector: when field changes, reset operator to first available operator for that field type
Operator selector: use OPERATORS_BY_FIELD_TYPE[field.type] to get available operators

Value input: render based on field type AND operator:
  - is_empty / is_not_empty / is_true / is_false: no value input (hide value input entirely)
  - boolean: no value input
  - select: Radix Select with the field's option labels
  - multi_select: same
  - date: <input type="date" />
  - number: <input type="number" />
  - all others: text input

Every onChange immediately calls onUpdateConfig({ filters: updatedFilters })

STEP 6 — Update ViewSortBar.tsx to use proper field selectors with icons:
Field selector: Radix Select showing all fields with FieldTypeIcon prefix
Direction toggle: Two buttons "A→Z" and "Z→A" (or use ArrowUp / ArrowDown icons)
dnd-kit sortable list for priority reordering
Every change: onUpdateConfig({ sorts: updatedSorts })

STEP 7 — Update CollectionPage to pass fields to useRows:
useRows(collection.id, activeView?.config, fields)

VERIFY: Adding a filter "Status equals Done" hides non-done rows immediately. Adding a sort by date sorts correctly. Multiple filters work (AND). Clearing filters restores all rows.
```

---

#### TASK 1.13 — Command Palette

**What it builds:** Fully working, schema-aware Cmd+K command palette with all command groups, fuzzy search, recent commands.
**Depends on:** Task 1.12
**Files created:** `src/stores/commandStore.ts`, `src/hooks/useCommandRegistry.ts`, `src/components/command/CommandPalette.tsx`, `src/components/command/CommandGroup.tsx`, `src/components/command/CommandItem.tsx`

**Cursor Prompt:**
```
Build the complete Kern Command Palette using the cmdk library.

STEP 1 — Create src/stores/commandStore.ts:
Zustand store with persist middleware:
  recentCommandIds: string[] (max 10, most recent first)
  addRecentCommand(id: string): void
    - Remove id if already in array
    - Prepend to front
    - Trim to max 10

Persist to localStorage with key 'kern-commands'.

STEP 2 — Create src/hooks/useCommandRegistry.ts:
Returns CommandDefinition[] array. Dynamically generated based on current app state.

interface CommandDefinition {
  id: string
  group: 'Navigation' | 'Collections' | 'Rows' | 'Views' | 'Filters' | 'Sorts' | 'Settings'
  label: string
  icon: React.ComponentType<{ size?: number, className?: string }>
  shortcut?: string
  keywords?: string  // extra search aliases
  action(): void
}

Hook should:
- useCollections() to get collections list
- useFields(activeCollectionSlug ? collection?.id : undefined) for active collection's fields
- useViews(collection?.id) for active collection's views
- useNavigate(), useLocation() for navigation commands
- appStore for openPalette/closePalette, openRow, etc.

Build these command groups:

NAVIGATION group (always available):
  { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, shortcut: 'G then D', action: () => navigate('/dashboard') }
  { id: 'nav-settings', label: 'Go to Settings', icon: Settings, action: () => navigate('/settings') }
  { id: 'nav-sidebar', label: 'Toggle sidebar', icon: PanelLeft, shortcut: '⌘\\', action: () => appStore.toggleSidebar() }
  For each collection:
    { id: `nav-col-${c.slug}`, label: `Go to ${c.name}`, icon: ... (use collection icon), keywords: c.slug, action: () => navigate(`/c/${c.slug}`) }

COLLECTIONS group:
  { id: 'col-create', label: 'Create new collection', icon: Plus, shortcut: '⌘N', action: () => ... open create modal }
  If on collection page:
    { id: 'col-edit', label: `Edit ${collection.name}`, icon: Pencil, action: () => ... open edit modal }
    { id: 'col-delete', label: `Delete ${collection.name}`, icon: Trash2, keywords: 'remove', action: () => ... open delete dialog }

ROWS group (only if on collection page):
  For each collection:
    { id: `row-add-${c.slug}`, label: `Add row to ${c.name}`, icon: PlusCircle, action: () => ... createRow then openRow }

VIEWS group (only if on collection page):
  { id: 'view-add-table', label: 'Add table view', icon: Table2, action: () => createView({ type: 'table' }) }
  { id: 'view-add-kanban', label: 'Add kanban view', icon: Columns, action: () => createView({ type: 'kanban' }) }
  { id: 'view-add-calendar', label: 'Add calendar view', icon: Calendar, action: () => createView({ type: 'calendar' }) }
  { id: 'view-add-gallery', label: 'Add gallery view', icon: LayoutGrid, action: () => createView({ type: 'gallery' }) }
  { id: 'view-add-custom', label: 'New custom view', icon: Code2, action: () => navigate(`/c/${slug}/views/custom/new`) }
  If has active view:
    { id: 'view-clear-filters', label: 'Clear all filters', icon: FilterX, action: () => updateView({ filters: [] }) }

FILTERS group (only if on collection page, only if collection has fields):
  For each field in active collection:
    { id: `filter-${field.slug}`, label: `Filter by ${field.name}`, icon: Filter, action: () => ... open filter bar + add rule for this field }

SORTS group (only if on collection page, only if collection has fields):
  For each field:
    { id: `sort-${field.slug}-asc`, label: `Sort by ${field.name} A→Z`, icon: ArrowUpAZ, action: () => updateView({ sorts: [{ id: uuid(), field_slug: field.slug, direction: 'asc' }] }) }
    { id: `sort-${field.slug}-desc`, label: `Sort by ${field.name} Z→A`, icon: ArrowDownAZ, action: () => ... }

SETTINGS group:
  { id: 'settings-open', label: 'Open settings', icon: Settings, action: () => navigate('/settings') }
  { id: 'settings-mcp', label: 'Copy MCP server URL', icon: Copy, action: () => { navigator.clipboard.writeText(mcpUrl); toast.success('Copied!') } }

STEP 3 — Create src/components/command/CommandPalette.tsx:
This is a Radix Dialog controlled by appStore.paletteOpen.

Dialog is opened/closed by appStore.openPalette/closePalette.
Dialog.Content: fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[620px] bg-kern-bg rounded-kern-xl border border-kern-border shadow-2xl overflow-hidden

Inside: use cmdk's Command component:
  <Command loop shouldFilter={true}>
    <div className="border-b border-kern-border px-3 flex items-center gap-2 h-11">
      <Search size={16} className="text-kern-text-3 flex-shrink-0" />
      <Command.Input placeholder="Search anything..." className="flex-1 text-sm bg-transparent outline-none text-kern-text placeholder:text-kern-text-3" />
      <Kbd>Esc</Kbd>
    </div>
    
    <Command.List className="overflow-y-auto max-h-[380px] p-1">
      <Command.Empty className="text-center text-sm text-kern-text-2 py-8">
        No results for this search
      </Command.Empty>
      
      {/* Recent commands group (shown when no search input) */}
      {!search && recentCommands.length > 0 && (
        <Command.Group heading="Recent">
          {recentCommands.map(cmd => <CommandItem key={cmd.id} command={cmd} onSelect={handleSelect} />)}
        </Command.Group>
      )}
      
      {/* All command groups */}
      {GROUPS.map(group => {
        const groupCommands = commands.filter(c => c.group === group && (!recentIds.has(c.id) || !!search))
        if (groupCommands.length === 0) return null
        return (
          <Command.Group key={group} heading={group}>
            {groupCommands.map(cmd => <CommandItem key={cmd.id} command={cmd} onSelect={handleSelect} />)}
          </Command.Group>
        )
      })}
    </Command.List>
  </Command>

handleSelect(command):
  appStore.closePalette()
  command.action()
  commandStore.addRecentCommand(command.id)

Track search input value with useState to conditionally show Recent group.

STEP 4 — Create src/components/command/CommandItem.tsx:
Props: command: CommandDefinition, onSelect: (cmd: CommandDefinition) => void

<Command.Item value={`${command.label} ${command.keywords ?? ''}`} onSelect={() => onSelect(command)}
  className="flex items-center gap-2.5 px-3 py-2 rounded-kern-sm cursor-pointer text-sm text-kern-text
  aria-selected:bg-kern-accent/10 aria-selected:text-kern-accent">
  <command.icon size={15} className="text-kern-text-3 flex-shrink-0 aria-selected:text-kern-accent" />
  <span className="flex-1">{command.label}</span>
  {command.shortcut && <Kbd>{command.shortcut}</Kbd>}
</Command.Item>

Group headings style: text-[10px] font-semibold uppercase tracking-widest text-kern-text-3 px-2 py-1.5

STEP 5 — Update AppShell.tsx:
Replace placeholder CommandPalette with the real one.
Make sure the global Cmd+K listener prevents default (so browser doesn't open its own search).

VERIFY: Press Cmd+K → palette opens. Type "books" → "Go to Books" appears. Press Enter → navigate. Arrow keys work. Escape closes. Recent commands appear at top on next open.
```

---

#### TASK 1.14 — Dashboard

**What it builds:** Full working Dashboard with all 5 widget types, add/remove widgets, grid layout.
**Depends on:** Task 1.13
**Files created:** `src/hooks/useDashboard.ts`, `src/components/dashboard/Dashboard.tsx`, `src/components/dashboard/WidgetWrapper.tsx`, `src/components/dashboard/AddWidgetModal.tsx`, all widget components, updated `src/pages/DashboardPage.tsx`

**Cursor Prompt:**
```
Build the complete Kern Dashboard with all 5 widget types.

STEP 1 — Create src/hooks/useDashboard.ts:

useWidgets(): TanStack Query
  queryKey: ['widgets', userId]
  queryFn: supabase.from('dashboard_widgets').select('*').order('position_y').order('position_x')
  select: (data) => (data.data ?? []) as DashboardWidget[]

useCreateWidget(): useMutation
  mutationFn receives: Omit<DashboardWidget, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  Inserts with user_id from auth
  onSuccess: invalidate ['widgets', userId]

useUpdateWidget(): useMutation
  mutationFn receives: { id, position_x?, position_y?, width?, height?, config?, title? }
  Partial update
  onSuccess: invalidate ['widgets', userId]

useDeleteWidget(): useMutation
  mutationFn receives: { id }
  Optimistic: remove from cache immediately
  onSuccess: invalidate ['widgets', userId]

STEP 2 — Create all widget components:

src/components/dashboard/widgets/CollectionStatsWidget.tsx:
Props: config: { collection_id: string }
Uses useCollection(undefined) — need useCollectionById, add it to useCollections.ts
Uses useRows(collection_id) to get row count + today count

Display:
  Collection icon (large 28px) + collection name (text-sm font-medium)
  Row count: text-4xl font-bold text-kern-text (the big number)
  "rows" text below in kern-text-2
  Divider
  "Added today: N" (text-xs text-kern-text-2)
  "Last updated: [relative time]" (text-xs text-kern-text-3)

src/components/dashboard/widgets/RecentRowsWidget.tsx:
Props: config: { collection_id: string, limit: number, show_fields: string[] }
Uses useRows with sort by created_at desc, limit applied client-side

Display:
  List of rows (each: primary value + one field value + time ago)
  Each row is clickable → appStore.openRow
  "+ Add row" link at bottom → useCreateRow + openRow

src/components/dashboard/widgets/ViewEmbedWidget.tsx:
Props: config: { collection_id: string, view_id: string }
Uses useViews + useRows + useFields

For now: render a simplified read-only list of rows (not full table/kanban — just a compact list).
Each row: primary field value + created_at
Show view name as a subtitle
"Open view →" link at bottom

src/components/dashboard/widgets/LiveSourceStatusWidget.tsx:
Props: config: { collection_id: string }
Uses useCollectionById

Display:
  Source type icon (GitHub/Calendar/Notion/etc.) + collection name
  Status dot: green (idle) / amber pulse (syncing) / red (error)
  "Last synced: [relative time]" or "Never synced"
  Error message (if sync_status === 'error')
  "Sync now" button → supabase.functions.invoke with loading state

src/components/dashboard/widgets/QuickAddWidget.tsx:
Props: config: { collection_id: string, prefill?: Record<string, unknown> }
Uses useCollectionById, useFields, useCreateRow

Display:
  Collection icon + name as header (text-sm font-medium)
  Primary field Input (autofocus=false)
  Optional: show up to 2 more fields from prefill keys as readonly tags
  "Add" Button (primary, small)
  
  On submit:
    useCreateRow.mutate({ collectionId, data: { [primaryField.slug]: inputValue, ...prefill } })
    Brief "Added! ✓" state then reset input

STEP 3 — Create src/components/dashboard/WidgetWrapper.tsx:
Props: widget: DashboardWidget, children: ReactNode, onDelete: () => void

Styles: bg-kern-bg rounded-kern-xl border border-kern-border shadow-sm overflow-hidden group
CSS Grid placement: style={{ gridColumn: `${widget.position_x} / span ${widget.width}`, gridRow: `${widget.position_y} / span ${widget.height}` }}

Header (h-10, px-4, flex items-center border-b border-kern-surface-2 group-hover:border-kern-border):
  Widget title (text-sm font-medium text-kern-text) or auto-title from type
  ml-auto: X button (opacity-0 group-hover:opacity-100, ghost danger 24px)
  X click: sonner toast with undo for 5s, then call onDelete

Body: p-4, overflow-auto, flex-1

STEP 4 — Create src/components/dashboard/AddWidgetModal.tsx:
Two-step modal:

Step 1 — Widget type picker:
5 cards in 2-3 column grid:
  - "Collection stats" — BarChart2 icon
  - "Recent rows" — List icon
  - "View embed" — Table2 icon
  - "Live source status" — RefreshCw icon
  - "Quick add" — PlusCircle icon

Step 2 — Configure:
All types:
  Collection selector: Radix Select of all user collections

Additional per type:
  recent_rows: Limit (5/10/20) + secondary field selector
  view_embed: View selector (loaded after collection selected)
  quick_add: Optional prefill note ("Rows will be created with these default values")

Title input (optional for all types)

Footer: Back button + "Add widget" button

On submit: find first empty 2×2 spot in existing widgets grid, call useCreateWidget.

Helper to find empty spot:
  Check positions 1-10 (y), 1-11 (x, since widget is 2 wide) for first spot where no existing widget overlaps.

STEP 5 — Create src/components/dashboard/Dashboard.tsx:
Props: none (uses useWidgets internally)

Container: min-h-full p-6 bg-kern-surface
Grid: display grid, grid-template-columns: repeat(12, 1fr), gap 16px, auto rows

Render:
  Dashboard header (flex, mb-6):
    "Dashboard" text (text-xl font-semibold)
    "+ Add widget" button (secondary)

  If no widgets: EmptyState (Dashboard icon, "Build your dashboard", "Add widgets to see your data at a glance", "Add widget" action)
  
  Else: widgets.map(widget => <WidgetWrapper key={widget.id} widget={widget} onDelete={() => deleteWidget(widget.id)}>{renderWidget(widget)}</WidgetWrapper>)

renderWidget(widget):
  Switch on widget.type:
    collection_stats → <CollectionStatsWidget config={widget.config} />
    recent_rows → <RecentRowsWidget config={widget.config} />
    view_embed → <ViewEmbedWidget config={widget.config} />
    live_source_status → <LiveSourceStatusWidget config={widget.config} />
    quick_add → <QuickAddWidget config={widget.config} />

STEP 6 — Update src/pages/DashboardPage.tsx:
  <div className="flex flex-col h-full">
    <Dashboard />
    <AddWidgetModal open={addOpen} onOpenChange={setAddOpen} />
  </div>

Wire "+ Add widget" in Dashboard to open AddWidgetModal via a callback prop or shared state.

VERIFY: Dashboard shows empty state. Add all 5 widget types. Collection stats shows row count. Recent rows shows clickable rows. Quick add creates a row. Delete widget with undo works.
```

---

### BLOCK 7: Phase 1 Polish

---

#### TASK 1.15 — Settings Page & Theme

**What it builds:** Full Settings page with profile editing, theme toggle, MCP instructions, danger zone.
**Depends on:** Task 1.14
**Files created:** `src/pages/SettingsPage.tsx` (full implementation)

**Cursor Prompt:**
```
Build the complete Kern Settings page.

Create src/pages/SettingsPage.tsx with these four tabs:
Use Radix Tabs for the tab container. Layout: full page, p-8 max-w-3xl mx-auto.

TAB 1 — Profile:
  Avatar section:
    - 64px circle showing avatar_url image OR initials with kern-accent background
    - "Change avatar" button (secondary, small) → opens file input (hidden, accept="image/*")
    - On file select: upload to kern-avatars/{userId}/avatar.jpg via supabase.storage
    - Update profile.avatar_url after upload
    - Optimistic: show new image immediately using URL.createObjectURL

  Full name:
    Input with current value, saves on blur via updateProfile
    "Saved ✓" inline indicator after save

  Email:
    Input but disabled (read-only), grayed out
    Small note: "Email cannot be changed here"

TAB 2 — Appearance:
  Theme section:
    Two radio cards side by side: "Light" and "Dark"
    Each card: 120px × 80px preview thumbnail (draw using CSS — light: white bg + gray text boxes, dark: dark bg + lighter boxes)
    Selected: ring-2 ring-kern-accent
    On select: setTheme('light'|'dark')

  Sidebar section:
    "Collapse sidebar by default" toggle (Radix-style checkbox with label)
    On change: appStore.setSidebarCollapsed(value)

TAB 3 — Integrations (Claude MCP):
  Card with border, rounded-kern-xl, p-6:
  
  Header: "Claude MCP Integration" (font-semibold) + Code2 icon
  Description: "Connect Claude to your Kern workspace. Claude can read and write all your collections and rows using natural language."
  
  MCP Server URL section:
    Label: "MCP Server URL"
    Code block (monospace, bg-kern-surface-2, rounded, px-4 py-3 text-sm border border-kern-border):
      Shows: `https://{supabaseProjectRef}.supabase.co/functions/v1/kern-mcp`
      (Get the project ref from VITE_SUPABASE_URL — extract from the URL)
    Copy button beside it → navigator.clipboard.writeText, toast.success('Copied MCP URL!')
  
  Auth Token section:
    Label: "Your Auth Token"
    "Generate token" button → supabase.auth.getSession() → show the access_token
    Once shown: same code block style, Copy button
    Warning text (amber, small): "Keep this token private. It provides full access to your Kern data."
  
  Setup instructions (Radix Collapsible, collapsed by default):
    Trigger: "How to connect Claude ↓"
    Steps:
      1. Copy the MCP Server URL above
      2. In Claude.ai → Settings → Integrations → Add MCP server
      3. Paste the URL and set your Auth Token as the Bearer token
      4. Test: ask Claude "What collections do I have in Kern?"
  
  "Test connection" button (secondary):
    Calls: fetch(mcpUrl, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'tools/list' }) })
    On success: show a green ✓ "Connected! N tools available"
    On failure: show red ✗ "Connection failed: [error message]"

TAB 4 — Danger Zone:
  Red-bordered card, p-6, rounded-kern-xl border-2 border-kern-danger/30

  "Export all data" section:
    Description: "Download all your Kern data as JSON"
    "Export" button (secondary) → fetch all collections + fields + rows, JSON.stringify, trigger download as kern-export-[date].json

  "Delete account" section:
    Description: "This will permanently delete your account and all data"
    "Delete account" button (danger) → opens confirmation:
      Modal asking to type email address
      On confirm: supabase.auth.signOut() → navigate('/login')
      Note: full account deletion requires server-side access. Show a note: "Your data will be deleted within 24 hours."

STEP 2 — Add keyboard shortcuts modal:
Create src/components/ui/KeyboardShortcutsModal.tsx:
Props: open: boolean, onOpenChange: (v: boolean) => void

Grid of shortcut pairs (label + Kbd component):
  Global: ⌘K, ⌘\, Escape
  Table: Enter (expand row), Tab (next cell), Shift+Tab (prev cell), Click header (sort)
  Row editor: ⌘Enter (save), Tab (next field), Escape (close)
  Collections: ⌘N (new collection)

Wire to UserMenu "Keyboard shortcuts" item and Cmd+K "Keyboard shortcuts" command.

STEP 3 — Update NotFoundPage.tsx:
  Centered content: 404 in large font (text-8xl font-mono text-kern-text-3)
  "Page not found" subtitle
  "← Go home" button → navigate('/dashboard')

VERIFY: All 4 settings tabs work. Theme toggle changes the app theme. MCP URL copied. Export downloads JSON. Keyboard shortcuts modal shows.
```

---

#### TASK 1.16 — Phase 1 Final Polish & Hardening

**What it builds:** Error boundaries, all missing empty states, optimistic update improvements, TypeScript cleanup, performance fixes.
**Depends on:** Task 1.15
**Files created/modified:** `src/components/ui/ErrorBoundary.tsx`, multiple updates across existing files

**Cursor Prompt:**
```
Final hardening pass for Kern Phase 1 — fix edge cases, add error boundaries, improve robustness.

STEP 1 — Create src/components/ui/ErrorBoundary.tsx:
React class component (error boundaries must be class components):
  state: { hasError: boolean, error: Error | null }
  static getDerivedStateFromError(error): returns { hasError: true, error }
  componentDidCatch(error, info): console.error in dev
  
  render: 
    If hasError: show centered error state:
      AlertCircle icon (48px, text-kern-danger)
      "Something went wrong" title
      In DEV: show error.message in a code block (text-xs, bg-kern-surface-2, p-3, rounded, max-w-sm)
      "Try again" button → this.setState({ hasError: false, error: null })
    Else: render children

Wrap these with ErrorBoundary:
  - CollectionPage main content (below the header)
  - Dashboard widget content area (around each WidgetWrapper child)
  - RowEditorPanel body

STEP 2 — Fix collection page edge cases:
  - If no views exist after loading and creating default view fails: show EmptyState "Could not load views" with "Try again" button
  - If active view ID from URL doesn't exist in views list: fall back to first view, update URL
  - If collection has no fields at all: show inline prompt in table header "Add your first field →" 
  - If primary field was deleted: show a banner "This collection has no primary field. Mark a field as primary to fix this." with a button to open field settings

STEP 3 — Add all missing success/error toasts:
Go through every useMutation call in the codebase and ensure:
  onSuccess toasts (use toast.success from Sonner):
    Collection created: toast.success(`${icon} ${name} created`)
    Collection deleted: toast.success(`${name} deleted`, { action: { label: 'Undo', onClick: reCreateCollection } })
    Row created: toast.success(`Row added`)
    Row deleted: toast.success(`Row deleted`, { action: { label: 'Undo', onClick: reCreateRow } }) — store the deleted row data in the mutation for 5s
    Field added: toast.success(`${name} field added`)
    Profile saved: toast.success('Profile saved')
    MCP URL copied: toast.success('Copied to clipboard')
  
  onError toasts (use toast.error):
    Any failed mutation: toast.error('Something went wrong', { description: error.message })

STEP 4 — Add keyboard shortcuts to key interactions:
  Table view:
    Global keydown (when table is focused and no cell is in edit mode):
      ArrowDown/Up: move focus between rows
      Enter: open focused row in editor (appStore.openRow)
    Cell editing:
      Enter: confirm + move to next row, same column
      Tab: confirm + move to next column, same row
      Shift+Tab: confirm + move to previous column
      Escape: cancel + close edit mode
  
  Row editor:
    Tab: move to next field
    Shift+Tab: move to previous field
    Escape: close panel (appStore.closeRow)
    Cmd+Enter: save all pending changes and close
  
  Modals (all modals using Modal.tsx):
    Escape: call onOpenChange(false) — already handled by Radix Dialog

STEP 5 — Performance improvements:
  Prefetch on sidebar hover:
    In SidebarCollectionItem: onMouseEnter after 200ms delay:
      queryClient.prefetchQuery({ queryKey: ['fields', collection.id], queryFn: ... })
      queryClient.prefetchQuery({ queryKey: ['views', collection.id], queryFn: ... })
    Use a ref to store the timeout, clear it on mouseLeave.
  
  Memoize expensive computations:
    In TableView: wrap buildColumns in useMemo([fields, viewConfig.hidden_fields, viewConfig.table_column_widths])
    In Sidebar: wrap collection list rendering in useMemo([collections, pathname])
    Add React.memo to: KanbanCard, SidebarCollectionItem, CellRenderer, RelationPill
  
  Debounce text cell saves:
    In TextCell, RichTextCell: don't call onSave on every keystroke
    Use a 500ms debounce (useRef + setTimeout pattern, clear on unmount)
    Show a subtle dot in the row while debounce is pending (optional, just the debounce is required)

STEP 6 — TypeScript cleanup:
  Run: npx tsc --noEmit
  Fix all TypeScript errors.
  Replace any remaining 'any' types with proper types.
  Make sure all hook return types are explicitly typed.
  Ensure all component props have TypeScript interfaces.

STEP 7 — Final test checklist:
Verify ALL of these work before calling Phase 1 done:
  [ ] Sign up → sign in → sign out → sign in again
  [ ] Create 3 different collections with different icons/colors
  [ ] Add 5 different field types to a collection
  [ ] Add 10 rows, edit them inline in the table
  [ ] Sort by a text field and a date field
  [ ] Add 2 filters, verify rows disappear/appear
  [ ] Drag reorder rows in Kanban view
  [ ] Open row editor, edit relation field
  [ ] Dashboard: add all 5 widget types
  [ ] Cmd+K: navigate, create, filter via keyboard
  [ ] Settings: change theme, copy MCP URL
  [ ] Refresh the page → all data persists, auth session persists
  [ ] Sidebar collapse/expand with Cmd+\

PHASE 1 IS COMPLETE AFTER THIS TASK.
```

---

## PHASE 2 — Power Features (Weeks 5–8)

---

#### TASK 2.1 — MCP Server Edge Function

**What it builds:** Full MCP server as Supabase Edge Function — all 9 tools, JWT auth, ready to connect to Claude.
**Depends on:** Phase 1 complete
**Files created:** `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/auth.ts`, `supabase/functions/kern-mcp/index.ts`

**Cursor Prompt:**
```
Build the Kern MCP server as a Supabase Edge Function. This is what lets Claude talk to Kern.

STEP 1 — Create supabase/functions/_shared/cors.ts:
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

STEP 2 — Create supabase/functions/_shared/auth.ts:
Deno TypeScript. Import createClient from supabase-js.
Export async function getAuthenticatedUserId(req: Request): Promise<string | null>
  - Extract Bearer token from Authorization header
  - Create a Supabase admin client using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
  - Call supabase.auth.getUser(token) to validate the JWT
  - Return user.id if valid, null if not

STEP 3 — Create supabase/functions/kern-mcp/index.ts:
Full Deno Edge Function implementing MCP protocol (JSON-RPC style).

Entry: Deno.serve(async (req) => { ... })
  - Handle OPTIONS: return new Response('ok', { headers: corsHeaders })
  - Validate auth: getAuthenticatedUserId(req)
    If null: return 401 JSON error

  - Parse body: const body = await req.json()
  - Route: body.method === 'tools/list' OR body.method === 'tools/call'

TOOLS LIST:
Return an array of 9 tool definitions (name + description + inputSchema for each):
  list_collections, query_rows, get_row, create_row, update_row, delete_row, create_collection, add_field, search_rows

Each inputSchema follows JSON Schema format. Copy the exact schemas from KERN_PRD_SPEC.md section 19.3.

TOOL IMPLEMENTATIONS (body.method === 'tools/call'):
Create a Supabase client using service role key (so we bypass RLS and scope manually):
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

All queries must add .eq('user_id', userId) to scope to the authenticated user.

list_collections:
  Fetch all collections for userId with their fields:
    const { data: collections } = await supabase.from('collections').select('*, fields(*)').eq('user_id', userId).order('sort_order')
  For each collection: add row_count via separate query or COUNT in the select
  Return: { collections: Array<{ id, name, slug, icon, is_live_source, row_count, fields }> }

query_rows:
  Get collection by slug, verify it belongs to userId
  Build query with optional filters and sort
  Apply filters: for each filter { field, operator, value }:
    eq: .eq(`data->>'${field}'`, String(value))
    contains: .ilike(`data->>'${field}'`, `%${value}%`)
    gt/lt/gte/lte: .filter(`data->>'${field}'`, operator, String(value))
  Apply sort: .order(`data->>'${args.sort.field}'`, { ascending: args.sort.direction === 'asc' })
  Limit: .limit(args.limit ?? 50)
  Return: { rows, total_count }

get_row:
  Fetch row by id, verify user_id ownership
  Return: the full row

create_row:
  Get collection by slug, verify ownership
  Insert row with data, collection_id, user_id
  Return: created row

update_row:
  Fetch existing row, verify user_id
  Merge: const merged = { ...existing.data, ...args.data }
  Update with merged data
  Return: updated row

delete_row:
  Verify row belongs to userId, delete
  Return: { deleted: true, row_id }

create_collection:
  Insert collection with user_id
  Insert default primary text field (name: 'Name', slug: 'name', type: 'text', is_primary: true)
  If args.fields: insert additional fields
  Return: { collection, fields }

add_field:
  Get collection by slug, verify ownership
  Get max sort_order of existing fields
  Insert new field
  Return: created field

search_rows:
  Build query: .ilike('data::text', `%${args.query}%`)
  If collection_slug provided: filter by that collection
  Else: search across all user's collections
  Return: { rows, matching_collections }

Error handling throughout:
  If collection not found: return { error: { code: 'NOT_FOUND', message: 'Collection not found' } }
  If unauthorized: return { error: { code: 'UNAUTHORIZED', message: 'Row does not belong to user' } }
  Wrap all in try/catch: return { error: { code: 'INTERNAL_ERROR', message: error.message } }

Set secret: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your_local_service_role_key_from_supabase_start>

STEP 4 — Test locally:
supabase functions serve kern-mcp --env-file .env.local

Get your JWT: in browser console → (await supabase.auth.getSession()).data.session.access_token

Test with curl:
  curl -X POST http://localhost:54321/functions/v1/kern-mcp \
    -H "Authorization: Bearer <YOUR_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"method":"tools/list"}'

Expected: returns JSON with array of 9 tools.

Also test create_row:
  curl -X POST http://localhost:54321/functions/v1/kern-mcp \
    -H "Authorization: Bearer <YOUR_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"method":"tools/call","params":{"name":"create_row","arguments":{"collection_slug":"books","data":{"name":"Test Book"}}}}'

STEP 5 — Update Settings Integrations tab:
  The "Test connection" button should call the MCP server using the user's current session token and show the tools list in a formatted code block.

VERIFY: MCP server responds to tools/list. All 9 tools return proper schemas. create_row creates a row visible in the app. query_rows returns correct data.
```

---

#### TASK 2.2 — GitHub Live Source

**What it builds:** GitHub OAuth flow, ConnectLiveSourceModal, GitHub sync Edge Function that upserts PRs/Issues into a collection.
**Depends on:** Task 2.1
**Files created:** `supabase/functions/_shared/crypto.ts`, `supabase/functions/sync-github/index.ts`, `src/components/live-sources/ConnectLiveSourceModal.tsx`, `src/components/live-sources/LiveSourceBadge.tsx`, `src/components/live-sources/sources/GitHubSourceConfig.tsx`, `src/pages/OAuthCallbackPage.tsx`

**Cursor Prompt:**
```
Build the GitHub live source integration for Kern — the first live source end-to-end.

STEP 1 — Create supabase/functions/_shared/crypto.ts:
Deno TypeScript AES-256-GCM encryption helpers.
  
export async function encrypt(plaintext: string, keyHex: string): Promise<string>
  // Use Web Crypto API (available in Deno)
  const key = await crypto.subtle.importKey('raw', hexToBytes(keyHex), { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  // Return base64(iv) + ':' + base64(encrypted)
  return [bytesToBase64(iv), bytesToBase64(new Uint8Array(encrypted))].join(':')

export async function decrypt(ciphertext: string, keyHex: string): Promise<string>
  const [ivB64, dataB64] = ciphertext.split(':')
  const key = await crypto.subtle.importKey('raw', hexToBytes(keyHex), { name: 'AES-GCM' }, false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(ivB64) }, key, base64ToBytes(dataB64))
  return new TextDecoder().decode(decrypted)

Include hexToBytes, bytesToBase64, base64ToBytes helpers.

STEP 2 — Create supabase/functions/sync-github/index.ts:
Deno Edge Function.

Input: POST request with JWT auth. No body required (all config comes from the collection).

Flow:
1. Get userId from JWT
2. Find all collections for this user where live_source_type starts with 'github_'
   (If body has collection_id: only sync that one. Otherwise sync all.)
3. For each collection:
   a. Decrypt access_token from live_source_config using ENCRYPTION_KEY env var
   b. Set sync_status = 'syncing'
   c. Fetch from GitHub API based on live_source_type:
      - github_prs: fetch all open+closed PRs
      - github_issues: fetch all issues
      - github_repos: fetch user repos
   d. Map to row data (field slugs defined below)
   e. Upsert rows using ON CONFLICT (collection_id, external_id) DO UPDATE
   f. Set sync_status = 'idle', last_synced_at = now()
   g. On error: set sync_status = 'error', sync_error_message = error.message

GitHub API calls (use fetch with Authorization: token {access_token}):
  PRs: GET https://api.github.com/user/repos → for each repo → GET /repos/{owner}/{repo}/pulls?state=all&per_page=100
  Issues: GET https://api.github.com/issues?per_page=100&state=all
  Repos: GET https://api.github.com/user/repos?per_page=100

PR field mapping (the slugs that fields will have):
  external_id: pr.node_id
  data.name: pr.title (primary field)
  data.status: pr.merged_at ? 'merged' : pr.state
  data.repo: pr.base.repo.full_name
  data.branch: pr.head.ref
  data.author: pr.user.login
  data.url: pr.html_url
  data.pr_number: String(pr.number)
  data.created_at: pr.created_at
  data.merged_at: pr.merged_at ?? null

Upsert SQL via supabase-js:
  supabase.from('rows').upsert(rowsArray, { onConflict: 'collection_id,external_id', ignoreDuplicates: false })

STEP 3 — Create src/components/live-sources/LiveSourceBadge.tsx:
Props: collection: KernCollection

Shows in CollectionHeader when is_live_source === true.

Display (small, right-aligned):
  - sync_status === 'idle': "⟳ Synced [relative time]" in text-kern-text-3 text-xs
  - sync_status === 'syncing': RefreshCw icon with animate-spin + "Syncing..." amber text
  - sync_status === 'error': AlertTriangle icon + "Sync failed" red text
  
Click: opens LiveSourceSettingsPopover

Create LiveSourceSettingsPopover (small popover, 220px):
  - Source type label (e.g., "GitHub Pull Requests")
  - Last synced + row count
  - "Sync now" button → supabase.functions.invoke('sync-github', { body: { collection_id: collection.id } })
    Show loading state, invalidate ['rows', collection.id] and ['collections'] on success
  - "Disconnect" button (danger, ghost) → TODO for later

STEP 4 — Create src/components/live-sources/ConnectLiveSourceModal.tsx:
Two-step modal.

Step 1 — Source picker grid:
  6 source cards: GitHub, Google Calendar, Notion, Linear, RSS Feed, Akiflow
  Each: icon + name + description (e.g., "Sync pull requests, issues, or repos")
  Clicking a card sets selectedSource and moves to step 2

Step 2 — Source config (render per source):
  GitHub: GitHubSourceConfig component
  Others: placeholder "Coming soon" for now

STEP 5 — Create src/components/live-sources/sources/GitHubSourceConfig.tsx:
Props: collectionId: string, onSuccess: () => void

Form:
  "What to sync" radio group:
    ● Pull Requests (selected by default)
    ○ Issues
    ○ Repositories

  "Repository filter" (optional):
    Input placeholder "owner/repo (leave empty for all)"
    Help text: "Leave empty to sync from all your repositories"

  "Connect GitHub" button (primary):
    onClick: build OAuth URL + open popup:
      const state = crypto.randomUUID()
      sessionStorage.setItem('oauth_state', state)
      sessionStorage.setItem('oauth_collection_id', collectionId)
      sessionStorage.setItem('github_sync_type', selectedType)
      sessionStorage.setItem('github_repo_filter', repoFilter)
      
      const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo&state=${state}&redirect_uri=${window.location.origin}/oauth/callback/github`
      window.open(oauthUrl, 'github-oauth', 'width=600,height=700')
      
      // Listen for message from popup:
      window.addEventListener('message', (e) => {
        if (e.data.type === 'OAUTH_SUCCESS' && e.data.provider === 'github') {
          onSuccess()
          toast.success('GitHub connected! Syncing now...')
        }
      })

STEP 6 — Create/update src/pages/OAuthCallbackPage.tsx:
Route: /oauth/callback/:provider

For GitHub:
  Extract code and state from URL params
  Verify state matches sessionStorage.getItem('oauth_state')
  Get collectionId, syncType, repoFilter from sessionStorage
  
  Call an Edge Function to exchange code for token:
  CREATE supabase/functions/oauth-callback-github/index.ts:
    Receives: { code, collection_id, sync_type, repo_filter, user_id }
    Exchanges code for access_token via POST https://github.com/login/oauth/access_token
    Encrypts the token using ENCRYPTION_KEY
    Creates/updates the collection:
      - Sets is_live_source = true, live_source_type = 'github_' + sync_type
      - Sets live_source_config = { access_token: encrypted, sync_type, repo_filter }
    Creates default fields for the collection based on sync_type (PR fields mapping above)
    Triggers initial sync by calling sync-github
    Returns: { success: true, collection_id }
  
  Back in OAuthCallbackPage:
    After Edge Function success:
      window.opener?.postMessage({ type: 'OAUTH_SUCCESS', provider: 'github' }, window.location.origin)
      window.close()
    If not a popup: navigate('/c/' + collection.slug)

STEP 7 — Wire ConnectLiveSourceModal into the app:
  CollectionActionsMenu: "Connect live source" → opens ConnectLiveSourceModal with collection.id
  Collection must be a manual collection (not already a live source)
  Alternatively: allow creating a NEW collection as a live source from the modal

VERIFY: Go through full flow: open ConnectLiveSourceModal → GitHub → enter a repo → Connect GitHub → popup opens → authorize → popup closes → collection shows "Syncing..." → rows appear. LiveSourceBadge shows correct status.
```

---

#### TASK 2.3 — Google Calendar & RSS Live Sources

**What it builds:** Google Calendar OAuth + sync Edge Function, RSS sync Edge Function.
**Depends on:** Task 2.2
**Files created:** `supabase/functions/sync-google-calendar/index.ts`, `supabase/functions/sync-rss/index.ts`, `src/components/live-sources/sources/GoogleCalendarSourceConfig.tsx`, `src/components/live-sources/sources/RSSSourceConfig.tsx`

**Cursor Prompt:**
```
Build Google Calendar and RSS live source sync functions for Kern.

STEP 1 — Create supabase/functions/sync-google-calendar/index.ts:
Deno Edge Function, same structure as sync-github.

Differences:
  OAuth scopes: https://www.googleapis.com/auth/calendar.readonly
  API: Google Calendar API v3
  
  live_source_config shape:
    { access_token, refresh_token, token_expiry, calendar_id: 'primary', sync_days_back: 90 }
  
  Token refresh:
    if (Date.now() > config.token_expiry - 300_000) {
      // Refresh token
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: decrypted_refresh_token,
          grant_type: 'refresh_token',
        })
      })
      const { access_token, expires_in } = await resp.json()
      // Update collection config with new encrypted access_token and expiry
    }
  
  Fetch events:
    const timeMin = new Date(Date.now() - syncDaysBack * 24 * 60 * 60 * 1000).toISOString()
    GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?maxResults=250&singleEvents=true&orderBy=startTime&timeMin={timeMin}
    Headers: { Authorization: 'Bearer ' + access_token }
  
  Handle pagination: nextPageToken in response
  
  Field mapping:
    external_id: event.id
    data.name: event.summary (primary)
    data.start_datetime: event.start.dateTime ?? event.start.date
    data.end_datetime: event.end.dateTime ?? event.end.date
    data.description: event.description ?? null
    data.location: event.location ?? null
    data.status: event.status (confirmed/tentative/cancelled)
    data.all_day: !event.start.dateTime (boolean)
  
  Auto-create fields on first sync (if collection has no fields yet).

STEP 2 — Add Google Calendar OAuth:
Create supabase/functions/oauth-callback-google/index.ts:
  Exchange code for tokens:
    POST https://oauth2.googleapis.com/token with code, client_id, client_secret, redirect_uri, grant_type=authorization_code
  Store access_token, refresh_token, expires_in, calendar_id in collection config (encrypted)
  Trigger initial sync

Add GoogleCalendarSourceConfig.tsx:
  "Calendar ID" input (default 'primary', help text: "Use 'primary' for your main calendar")
  "Sync events from last" select: 30 days / 90 days / 365 days
  "Connect Google Calendar" button → OAuth popup:
    GOOGLE_OAUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${...}&redirect_uri=${...}/oauth/callback/google&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent`

STEP 3 — Create supabase/functions/sync-rss/index.ts:
No OAuth needed.

live_source_config shape: { feed_url: string }

Flow:
  1. Fetch feed_url: const response = await fetch(config.feed_url)
  2. Get text: const xml = await response.text()
  3. Parse XML using DOMParser (available in Deno via a basic regex parser — write a simple one):
  
  Simple XML parser approach (no libraries in Deno Edge Functions):
    Detect format: XML contains <rss if RSS, <feed if Atom
    
    RSS parsing with regex (simple, not perfect but works for standard feeds):
      const items = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
      For each item string:
        Extract: title, link, pubDate, description, author via:
          const getTag = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/${tag}>`))?.[1]?.trim()
    
    Atom parsing:
      const entries = xml.match(/<entry[\s\S]*?<\/entry>/g) ?? []
      title = getTag, link = xml.match(/<link[^>]+href="([^"]+)"/)?.[1], updated = getTag
    
    Strip HTML from description/summary: text.replace(/<[^>]+>/g, '').trim()
  
  Map to rows:
    external_id: item.guid ?? item.link ?? crypto.randomUUID()
    data.name: item.title (primary)
    data.url: item.link
    data.published_at: new Date(item.pubDate ?? item.updated).toISOString()
    data.summary: stripHtml(item.description ?? item.summary ?? '')
    data.author: item.author ?? ''
    data.feed_name: (parse channel.title or feed.title from the XML root)
  
  Upsert rows.

STEP 4 — Add RSS to ConnectLiveSourceModal:
RSSSourceConfig.tsx:
  Feed URL input (type="url", required, placeholder "https://example.com/feed.xml")
  
  "Test feed" button:
    Calls a lightweight Supabase Edge Function endpoint that fetches the URL and returns the feed title
    Shows: "✓ Found feed: [feed title]" or error
  
  "Connect feed" button:
    Creates/updates collection with is_live_source=true, live_source_type='rss_feed'
    Sets live_source_config: { feed_url: url }
    Triggers initial sync: supabase.functions.invoke('sync-rss', { body: { collection_id } })
    NOTE: RSS doesn't need OAuth — just save the URL and sync immediately

STEP 5 — Update ConnectLiveSourceModal to show all connected sources:
In the source picker step, if a source type is already connected to the current collection: show a checkmark and "Connected" badge on that source card.

VERIFY: Add an RSS feed (try https://news.ycombinator.com/rss) → rows sync in. Google Calendar OAuth flow works (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be set). LiveSourceBadge shows correct status for each.
```

---

#### TASK 2.4 — Calendar View & Gallery View

**What it builds:** Full Calendar (month + week) and Gallery views. List view completion.
**Depends on:** Task 2.3
**Files created:** `src/components/views/CalendarView/CalendarView.tsx`, `src/components/views/CalendarView/CalendarMonth.tsx`, `src/components/views/GalleryView/GalleryView.tsx`, `src/components/views/GalleryView/GalleryCard.tsx`, updated `src/components/views/ListView/ListView.tsx`

**Cursor Prompt:**
```
Build the Calendar View and Gallery View for Kern. Both views are feature-complete.

STEP 1 — Calendar View:

src/components/views/CalendarView/CalendarView.tsx:
Props: rows, fields, viewConfig, collectionId, collection
State: currentDate: Date (today), displayMode: 'month' | 'week'

Guard: if !viewConfig.calendar_date_field:
  Show centered prompt: "Calendar view needs a date field"
  Radix Select with all date/datetime fields
  On select: useUpdateView({ config: { calendar_date_field: fieldSlug } })
  If no date fields: EmptyState "Add a Date or DateTime field to use Calendar view"

Header (flex items-center gap-4, mb-4, h-10):
  Left: ChevronLeft button → go to previous period
  Center: period label
    month mode: format(currentDate, 'MMMM yyyy')
    week mode: format(startOfWeek(currentDate), 'MMM d') + '–' + format(endOfWeek(currentDate), 'd, yyyy')
  Right: ChevronRight button + mode toggle ("Month" | "Week" buttons, active one has kern-accent bg)

Month view (CalendarMonth component):

  const firstDayOfMonth = startOfMonth(currentDate)
  const startDay = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }) // Monday start
  Generate 42 days (6 weeks × 7 days)
  
  7-column grid:
    Header row: Mo Tu We Th Fr Sa Su (text-xs text-kern-text-3)
    Day cells (each is a div, border-b border-r border-kern-border):
      Min-height: 80px
      Date number: text-sm in top-right corner
        If today: circle bg-kern-accent text-white rounded-full w-6 h-6 flex items-center justify-center
        If outside current month: text-kern-text-3 opacity-50
      
      Events (rows that fall on this date):
        Get dateStr = format(day, 'yyyy-MM-dd')
        const dayRows = rows.filter(r => r.data[calendarDateField.slug]?.toString().startsWith(dateStr))
        Show up to 3 event pills:
          Pill: bg-kern-accent/15 text-kern-accent text-xs rounded px-1.5 py-0.5 truncate cursor-pointer
          onClick: appStore.openRow(row.id, collectionId)
        If more than 3: "+ N more" link
      
      Click on empty day area:
        useCreateRow.mutate({ collectionId, data: { [calendarDateField.slug]: dateStr } })
        After creation: appStore.openRow(newRow.id, collectionId)

Week view (simplified):
  Show 7 columns (Mon–Sun), each with a date header
  Events listed below the date header as cards (same pill style)
  Click empty area: create row with that date

Drag events between days (optional for Phase 1, implement basic version):
  @dnd-kit: make each event pill draggable
  Drop target: each day cell is a droppable
  onDrop: useUpdateRow with new date value

STEP 2 — Gallery View:

src/components/views/GalleryView/GalleryCard.tsx:
Props: row: KernRow, fields: KernField[], coverFieldSlug: string | null, cardFieldSlugs: string[], collectionId: string

Card structure (rounded-kern-xl border border-kern-border overflow-hidden cursor-pointer bg-kern-bg hover:shadow-md transition-shadow group):
  
  Cover area (h-36, relative):
    If coverFieldSlug and row has file data:
      Show image (use getFileUrl hook for signed URL)
      <img className="w-full h-full object-cover" />
    Else:
      Solid color block using collection.color or random based on collection.id
      Show collection icon centered (large emoji)
  
  Card body (p-3):
    Primary value: text-sm font-medium text-kern-text, 2-line clamp (css: overflow-hidden display:-webkit-box -webkit-line-clamp:2 -webkit-box-orient:vertical)
    
    For each cardFieldSlug (max 3):
      const field = fields.find(f => f.slug === s)
      const value = row.data[s]
      if no field or no value: skip
      Render: 
        <div className="flex items-center gap-1 mt-1">
          <FieldTypeIcon type={field.type} size={10} className="text-kern-text-3 flex-shrink-0" />
          <span className="text-xs text-kern-text-2 truncate">{formatCellValue(field, value)}</span>
        </div>
    
    Helper formatCellValue(field, value):
      select: find option label from field.options
      boolean: value ? '✓' : '✗'
      date: formatRelativeTime(value)
      array: join with ', '
      else: String(value)

  Click: appStore.openRow(row.id, collectionId)

src/components/views/GalleryView/GalleryView.tsx:
Props: rows, fields, viewConfig, collectionId, collection

Card size from view options (no option yet → default medium):
  small: 5 columns, medium: 4 columns (for screens > 1280px), large: 3 columns
  Use CSS Grid: grid-template-columns: repeat(N, 1fr)

Render grid of GalleryCards + a "+ Add row" card at the end (dashed border, Plus icon centered, click=createRow+openRow)

Empty state when no rows.

Gallery view options (add to ViewOptionsMenu):
  Cover field: Select dropdown (only file-type fields shown, + "None" option)
  Card fields: Multi-select checkboxes of all collection fields (max 3 recommended)
  Card size: Small / Medium / Large toggle
  All changes: useUpdateView({ config: { gallery_cover_field, gallery_card_fields } })

STEP 3 — Complete List View:
src/components/views/ListView/ListView.tsx:
Props: rows, fields, viewConfig, collectionId

Simple vertical list (no table headers):
  Each row (h-10, px-4, flex items-center gap-3, border-b border-kern-surface-2, hover:bg-kern-surface cursor-pointer):
    Primary field value (text-sm, flex-1, truncate)
    Secondary field value (text-sm text-kern-text-2, truncate, max-w-[200px]):
      First non-primary, non-hidden field by sort_order
    Created-at (text-xs text-kern-text-3, flex-shrink-0): formatRelativeTime(row.created_at)
    Click: appStore.openRow(row.id, collectionId)
  
  Last item: "+ Add item" (same height, Plus icon + text, ghost style, creates row + opens editor)
  Empty state: EmptyState

STEP 4 — Wire all views into CollectionPage:
  activeView.type === 'calendar': <CalendarView ... />
  activeView.type === 'gallery': <GalleryView ... />
  activeView.type === 'list': <ListView ... />

VERIFY: Calendar shows events on correct dates. Clicking a date creates a row. Gallery shows cards with cover images from file fields. List view shows compact rows.
```

---

#### TASK 2.5 — File Uploads & Storage

**What it builds:** Working file field with Supabase Storage — upload, display, delete, gallery cover images, avatar uploads.
**Depends on:** Task 2.4
**Files created:** `src/hooks/useFileUpload.ts`, updated `src/components/cells/FileCell.tsx`, updated row editor file field

**Cursor Prompt:**
```
Implement the file field type end-to-end using Supabase Storage for Kern.

STEP 1 — Create Supabase Storage buckets via SQL migration:
Create supabase/migrations/00013_storage_buckets.sql:

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values 
    ('kern-files', 'kern-files', false, 52428800, null), -- 50MB limit, any type
    ('kern-avatars', 'kern-avatars', true, 5242880, '{"image/jpeg","image/png","image/webp","image/gif"}')
  on conflict (id) do nothing;

  -- RLS for kern-files (private, users access only their own files)
  create policy "Users can upload own files"
    on storage.objects for insert with check (bucket_id = 'kern-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  create policy "Users can read own files"
    on storage.objects for select using (bucket_id = 'kern-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  create policy "Users can delete own files"
    on storage.objects for delete using (bucket_id = 'kern-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  
  -- RLS for kern-avatars (public read)
  create policy "Avatars are public" on storage.objects for select using (bucket_id = 'kern-avatars');
  create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'kern-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  create policy "Users delete own avatar" on storage.objects for delete using (bucket_id = 'kern-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

Run: supabase db push

STEP 2 — Create src/hooks/useFileUpload.ts:

interface FileAttachment { path: string; name: string; size: number; type: string; }

// Signed URL cache to avoid regenerating every render
const signedUrlCache = new Map<string, { url: string, expiry: number }>()

export function useFileUpload() {
  const { user } = useAuth()
  
  async function uploadFile(file: File, collectionId: string, rowId: string): Promise<FileAttachment> {
    const ext = file.name.split('.').pop()
    const path = `${user!.id}/${collectionId}/${rowId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('kern-files').upload(path, file, { upsert: false })
    if (error) throw error
    return { path, name: file.name, size: file.size, type: file.type }
  }
  
  async function getFileUrl(path: string): Promise<string> {
    const cached = signedUrlCache.get(path)
    if (cached && cached.expiry > Date.now() + 60_000) return cached.url
    const { data, error } = await supabase.storage.from('kern-files').createSignedUrl(path, 3600)
    if (error || !data) throw error
    signedUrlCache.set(path, { url: data.signedUrl, expiry: Date.now() + 3600_000 })
    return data.signedUrl
  }
  
  async function deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from('kern-files').remove([path])
    if (error) throw error
    signedUrlCache.delete(path)
  }
  
  return { uploadFile, getFileUrl, deleteFile }
}

STEP 3 — Update src/components/cells/FileCell.tsx:
Display mode:
  No files: "—" in kern-text-3
  Has files: file count badge + paperclip icon + first file name (truncated)
  Click: opens FileManager popover

FileManager popover (280px wide, max-height 320px overflow-y-auto):
  Title: "Files ([N])" + Upload button
  
  File list:
    Each file row (flex items-center gap-2, h-10, px-2):
      File type icon: image→Image, pdf→FileText, default→Paperclip (16px, text-kern-text-2)
      File name (text-sm truncate flex-1)
      File size (text-xs text-kern-text-3)
      Download link (ExternalLink icon, opens signed URL in new tab)
      Delete button (X icon, ghost danger, onClick: deleteFile + update row data)
  
  Upload area (if edit mode):
    "Upload file" button or drag-drop zone
    <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} multiple />
    <button onClick={() => fileInputRef.current?.click()}>Upload file</button>
    Show progress per file being uploaded (linear progress bar)
    On complete: call useUpdateRow with updated files array

STEP 4 — Update RowEditorPanel file field section:
More generous UI than cell popover:
  
  Drop zone (when no files or always):
    Dashed border, rounded-kern-lg, p-6, text-center
    Upload icon + "Drop files here or click to browse" text
    Background on dragover: kern-accent/5
    onClick: open file picker, onDrop: handle dropped files
  
  File list below drop zone:
    Same as popover but with image preview:
    If file.type.startsWith('image/'): show thumbnail <img> (64px × 48px object-cover rounded-kern-sm) beside the file name
    If not image: show file type icon

STEP 5 — Update Settings page avatar upload:
"Change avatar" button:
  Opens hidden file input
  On file select: upload to kern-avatars/{userId}/avatar.jpg
  After upload: get public URL from supabase.storage.from('kern-avatars').getPublicUrl(path)
  Call updateProfile({ avatar_url: publicUrl })
  Show new avatar immediately (optimistic: URL.createObjectURL for preview)

STEP 6 — Gallery View cover images:
In GalleryCard:
  If coverFieldSlug is set:
    const files = row.data[coverFieldSlug] as FileAttachment[] ?? []
    if (files.length > 0 && files[0].type.startsWith('image/')):
      Use useFileUrl hook (create this):
        function useFileUrl(path: string | null) {
          return useQuery({ queryKey: ['file-url', path], queryFn: () => getFileUrl(path!), enabled: !!path, staleTime: 3_300_000 })
        }
      Render signed URL as cover image

VERIFY: Upload a file to a row. See it appear in FileCell and in the RowEditorPanel. Delete a file. Upload an image and see it as Gallery card cover. Upload an avatar in settings.
```

---

#### TASK 2.6 — Notion & Linear Live Sources

**What it builds:** Notion database sync and Linear issues sync Edge Functions.
**Depends on:** Task 2.5
**Files created:** `supabase/functions/sync-notion/index.ts`, `supabase/functions/sync-linear/index.ts`, source config components

**Cursor Prompt:**
```
Build Notion and Linear live source integrations for Kern.

STEP 1 — Create supabase/functions/sync-notion/index.ts:
Deno Edge Function.

Notion API base: https://api.notion.com/v1
Required header: Notion-Version: 2022-06-28

Flow:
1. Get collection config: { access_token, database_id }
2. Set sync_status = 'syncing'
3. Fetch database schema to understand field types:
   GET /databases/{database_id}
   Response: { properties: Record<string, { type: string, ...typeConfig }> }
4. Fetch all pages (handle pagination):
   POST /databases/{database_id}/query body: {}
   while (hasMore) { fetch with start_cursor }
5. Map each page to a Kern row:
   external_id: page.id
   For each property in page.properties:
     Map Notion type to value:
       title: prop.title.map(t => t.plain_text).join('')  → use as primary field (data.name)
       rich_text: prop.rich_text.map(t => t.plain_text).join('')
       number: prop.number ?? null
       select: prop.select?.name ?? null
       multi_select: prop.multi_select.map(s => s.name)
       date: prop.date?.start ?? null
       checkbox: prop.checkbox
       url: prop.url ?? null
       email: prop.email ?? null
       phone_number: prop.phone_number ?? null
       people: prop.people.map(p => p.name).join(', ')
       files: prop.files.map(f => f.external?.url ?? f.file?.url ?? '').filter(Boolean)
       formula/rollup/created_by/last_edited_by/last_edited_time/created_time: skip
6. On first sync: create KernFields matching the Notion schema
   (Only create fields that don't already exist — check by slug = slugify(propertyName))
   Skip formula/rollup properties.
7. Upsert rows using external_id = page.id
8. Update collection: last_synced_at, sync_status = 'idle'

STEP 2 — Add Notion OAuth:
Create supabase/functions/oauth-callback-notion/index.ts:
  Exchange code for access_token:
    POST https://api.notion.com/v1/oauth/token
    Basic auth: client_id:client_secret base64 encoded
    Body: { grant_type: 'authorization_code', code, redirect_uri }
  Response: { access_token, workspace_name, bot_id }
  
  After auth: fetch list of databases the user has shared:
    GET /search with body { filter: { property: 'object', value: 'database' } }
    Return list of { id, title } to the frontend for database selection

Create NotionSourceConfig.tsx:
  Step 1: "Connect Notion" button → OAuth:
    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${redirectUri}`
    window.open(url, 'notion-oauth', ...)
  
  Step 2 (after auth): Database picker:
    List of Notion databases (fetched after OAuth)
    Select which database to sync
    "Sync this database" button → creates/updates collection + triggers sync

STEP 3 — Create supabase/functions/sync-linear/index.ts:
Linear GraphQL API: https://api.linear.app/graphql
Auth: Bearer token

GraphQL query:
  query {
    issues(first: 250) {
      nodes {
        id
        title
        description
        state { name }
        priority
        assignee { name }
        team { name }
        dueDate
        createdAt
        url
        labels { nodes { name } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }

Handle pagination with endCursor until hasNextPage = false.

Priority mapping:
  0 → 'No Priority', 1 → 'Urgent', 2 → 'High', 3 → 'Medium', 4 → 'Low'

Field mapping:
  external_id: issue.id
  data.name: issue.title (primary)
  data.status: issue.state.name
  data.priority: priorityLabels[issue.priority]
  data.assignee: issue.assignee?.name ?? null
  data.team: issue.team.name
  data.labels: issue.labels.nodes.map(l => l.name) (stored as JSON array, but field type is text for simplicity — or multi_select if you auto-create the field with existing label options)
  data.due_date: issue.dueDate ?? null
  data.url: issue.url
  data.created_at: issue.createdAt

Auto-create fields on first sync.

For the status field: create it as a select field with options = all unique state names found in the data.
For the priority field: select field with fixed options (No Priority, Urgent, High, Medium, Low).
For labels: create as text field (comma-joined) for simplicity.

STEP 4 — Add Linear OAuth:
LinearSourceConfig.tsx:
  "Connect Linear" button → OAuth:
    const url = `https://linear.app/oauth/authorize?client_id=${LINEAR_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=read`

Create supabase/functions/oauth-callback-linear/index.ts:
  Exchange code for access_token:
    POST https://api.linear.app/oauth/token with code + credentials

VERIFY: Notion database syncs all its pages as Kern rows. Fields are auto-created matching Notion's schema. Linear issues sync. Status shows as select options.
```

---

#### TASK 2.7 — Realtime & Performance

**What it builds:** Supabase Realtime for live source auto-updates, performance optimizations, debounced saves, query prefetching.
**Depends on:** Task 2.6
**Files created:** Updates to `src/pages/CollectionPage.tsx`, `src/components/layout/Sidebar.tsx`, various cell components

**Cursor Prompt:**
```
Add Supabase Realtime subscriptions and performance optimizations to Kern.

STEP 1 — Add Realtime to CollectionPage:
When collection.is_live_source is true:

useEffect(() => {
  const channel = supabase
    .channel(`rows-${collectionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'rows',
      filter: `collection_id=eq.${collectionId}`,
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['rows', collectionId] })
      
      if (payload.eventType === 'INSERT') {
        setNewRowCount(prev => prev + 1)
      }
    })
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [collectionId])

// Show "N new rows" banner when newRowCount > 0:
// Banner: fixed top strip below collection header
// "5 new rows synced — Click to refresh" with X to dismiss
// Auto-dismiss after 10 seconds
// Clicking: setNewRowCount(0), scroll to top

STEP 2 — Add Realtime for sync_status in Sidebar:
In Sidebar.tsx:

useEffect(() => {
  const channel = supabase
    .channel('collections-sync-status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'collections',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      if (payload.new.sync_status !== payload.old.sync_status) {
        queryClient.invalidateQueries({ queryKey: ['collections', userId] })
      }
    })
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [userId])

This makes the LiveSourceBadge update in real-time when sync completes.

STEP 3 — Debounce all text cell saves:
In TextCell.tsx, EmailCell.tsx, PhoneCell.tsx, UrlCell.tsx, NumberCell.tsx:

Replace immediate onSave calls with debounced version:
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  
  const handleChange = (newValue: string) => {
    setLocalValue(newValue) // Local state updates immediately for smooth typing
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      onSave(newValue)
    }, 500)
  }
  
  // Cleanup on unmount
  useEffect(() => () => clearTimeout(saveTimeoutRef.current), [])
  
  // Save immediately on blur (don't wait for debounce)
  const handleBlur = () => {
    clearTimeout(saveTimeoutRef.current)
    onSave(localValue)
  }

STEP 4 — Sidebar prefetch on hover:
In SidebarCollectionItem.tsx:

const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

const handleMouseEnter = () => {
  prefetchTimeoutRef.current = setTimeout(() => {
    queryClient.prefetchQuery({
      queryKey: ['fields', collection.id],
      queryFn: () => supabase.from('fields').select('*').eq('collection_id', collection.id).order('sort_order'),
      staleTime: 120_000,
    })
    queryClient.prefetchQuery({
      queryKey: ['views', collection.id],
      queryFn: () => supabase.from('views').select('*').eq('collection_id', collection.id).order('sort_order'),
      staleTime: 120_000,
    })
  }, 200)
}

const handleMouseLeave = () => { clearTimeout(prefetchTimeoutRef.current) }

STEP 5 — Memoize TableView columns:
In TableView.tsx:
  const columns = useMemo(() => buildColumns(fields, viewConfig), [
    fields,
    viewConfig.hidden_fields.join(','),
    JSON.stringify(viewConfig.table_column_widths),
  ])

Add React.memo to:
  - KanbanCard
  - SidebarCollectionItem  
  - CellRenderer (memo + compare function: only re-render if value, isEditing, or field.type changes)
  - RelationPill

STEP 6 — Batch relation fetching:
In useRows, when the collection has relation fields:
  After fetching rows, also fetch all row_relations for those rows in ONE query:
    supabase.from('row_relations').select('*, target_row:rows!target_row_id(*)').in('source_row_id', rowIds)
  Build a Map: rowId → Map(fieldId → KernRow[])
  Attach to each KernRow as row.relations
  
  This eliminates N+1 queries for relation cells in the table.

STEP 7 — Add keepPreviousData for smoother view switching:
In useRows and useViews, add:
  placeholderData: keepPreviousData
This prevents the empty state from flashing when switching between views.

VERIFY: Open a live source collection, trigger a manual sync — new rows appear without page refresh. Table with 1000+ rows scrolls smoothly (verify by seeding data via Supabase Studio). Typing in a text cell doesn't fire save on every keystroke.
```

---

## PHASE 3 — The Differentiator (Weeks 9–12)

---

#### TASK 3.1 — Custom View Editor (Monaco + Babel + Sandbox)

**What it builds:** The Views as Code editor — Monaco editor, browser-side Babel compilation, sandboxed iframe renderer, live preview.
**Depends on:** Phase 2 complete
**Files created:** `src/lib/custom-view-types.ts`, `src/components/views/CustomView/CustomViewEditor.tsx`, `src/components/views/CustomView/CustomViewRenderer.tsx`, `src/hooks/useCustomViews.ts`

**Cursor Prompt:**
```
Build the Views as Code editor — the most important differentiating feature of Kern.

STEP 1 — Install dependencies:
npm install @monaco-editor/react @babel/standalone

STEP 2 — Create src/lib/custom-view-types.ts:
Export KERN_VIEW_TYPES_DTS: string

This is a TypeScript declaration file string injected into Monaco for IntelliSense.
It should declare:

declare module 'kern' {
  export interface KernRow { id: string; data: Record<string, unknown>; created_at: string; updated_at: string; }
  export interface SelectOption { id: string; label: string; color: string; }
  export interface KernField { id: string; name: string; slug: string; type: string; options: any; is_primary: boolean; }
  export interface KernViewProps {
    rows: KernRow[];
    fields: KernField[];
    collectionName: string;
    onRowUpdate(rowId: string, data: Record<string, unknown>): Promise<void>;
    onRowCreate(data: Record<string, unknown>): Promise<void>;
    onRowDelete(rowId: string): Promise<void>;
    onRowClick(rowId: string): void;
  }
}
// Make KernViewProps globally available (no import needed in custom views)
declare const rows: import('kern').KernRow[];
declare const fields: import('kern').KernField[];
// etc. — put the full interface in global scope

Also add type declarations for available libraries:
declare const Recharts: typeof import('recharts');
declare const dateFns: { format: Function, parseISO: Function, differenceInDays: Function, addDays: Function, startOfWeek: Function, startOfMonth: Function };

STEP 3 — Create src/components/views/CustomView/CustomViewRenderer.tsx:
This component renders user code in a sandboxed iframe.

Props: code: string, rows: KernRow[], fields: KernField[], collectionName: string, onRowUpdate, onRowCreate, onRowDelete, onRowClick

The iframe srcdoc template (a function that returns an HTML string):
function buildSandboxHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/recharts@2/umd/Recharts.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; font-family: -apple-system, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script>
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const Recharts = window.Recharts;
    
    window.addEventListener('message', (event) => {
      if (event.data.type !== 'KERN_RENDER') return;
      const { code, props } = event.data;
      
      try {
        // Create the component from code
        const moduleExports = {};
        const moduleFunc = new Function('exports', 'React', 'Recharts', code);
        moduleFunc(moduleExports, React, Recharts);
        const Component = moduleExports.default;
        
        if (!Component) {
          document.getElementById('root').innerHTML = '<div style="padding:16px;color:#e5484d">Error: Component must have a default export</div>';
          return;
        }
        
        // Create callbacks that post messages back to parent
        const viewProps = {
          ...props,
          onRowUpdate: (rowId, data) => window.parent.postMessage({ type: 'KERN_ROW_UPDATE', rowId, data }, '*'),
          onRowCreate: (data) => window.parent.postMessage({ type: 'KERN_ROW_CREATE', data }, '*'),
          onRowDelete: (rowId) => window.parent.postMessage({ type: 'KERN_ROW_DELETE', rowId }, '*'),
          onRowClick: (rowId) => window.parent.postMessage({ type: 'KERN_ROW_CLICK', rowId }, '*'),
        };
        
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Component, viewProps));
      } catch (err) {
        document.getElementById('root').innerHTML = '<div style="padding:16px;color:#e5484d;font-family:monospace;font-size:12px;white-space:pre-wrap">Error: ' + err.message + '</div>';
      }
    });
    
    window.parent.postMessage({ type: 'KERN_SANDBOX_READY' }, '*');
  </script>
</body>
</html>`
}

Component:
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'KERN_SANDBOX_READY') setIsReady(true)
      if (event.data.type === 'KERN_ROW_UPDATE') onRowUpdate(event.data.rowId, event.data.data)
      if (event.data.type === 'KERN_ROW_CREATE') onRowCreate(event.data.data)
      if (event.data.type === 'KERN_ROW_DELETE') onRowDelete(event.data.rowId)
      if (event.data.type === 'KERN_ROW_CLICK') onRowClick(event.data.rowId)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onRowUpdate, onRowCreate, onRowDelete, onRowClick])

  // When code or data changes and iframe is ready: send RENDER message
  useEffect(() => {
    if (!isReady || !iframeRef.current) return
    iframeRef.current.contentWindow?.postMessage({
      type: 'KERN_RENDER',
      code,
      props: { rows, fields, collectionName },
    }, '*')
  }, [isReady, code, rows, fields, collectionName])

  return (
    <div className="relative w-full h-full">
      {!isReady && <div className="absolute inset-0 flex items-center justify-center bg-kern-surface"><Loader2 className="animate-spin text-kern-text-3" /></div>}
      <iframe
        ref={iframeRef}
        srcDoc={buildSandboxHTML()}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        title="Custom view preview"
      />
    </div>
  )

STEP 4 — Create src/components/views/CustomView/CustomViewEditor.tsx:
Full-page layout (min-h-screen, bg-kern-bg):

Top bar (h-12, border-b, flex items-center px-4 gap-3):
  ← Back button → navigate back
  View name input (flex-1, centered, borderless, focus shows subtle underline)
  Status indicator: "Unsaved changes •" / "Saved ✓" / "Compiling..." / "Error (N)"
  Save button (primary, sm) + Cmd+S keyboard shortcut handler

Main area (flex-1, flex, overflow-hidden):
  Left 60% (relative):
    Monaco Editor component:
      height="100%", language="typescript", theme={appTheme === 'dark' ? 'vs-dark' : 'vs'}
      options={{ fontSize: 13, minimap: { enabled: false }, wordWrap: 'on', tabSize: 2, scrollBeyondLastLine: false }}
      
      On mount:
        monaco.languages.typescript.typescriptDefaults.addExtraLib(KERN_VIEW_TYPES_DTS, 'kern-types.d.ts')
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({ jsx: monaco.languages.typescript.JsxEmit.React, jsxFactory: 'React.createElement', target: monaco.languages.typescript.ScriptTarget.ES2020 })
      
      defaultValue: starter template (see below)
      onChange: setCode(newValue), setHasUnsavedChanges(true)
  
  Right 40% (bg-kern-surface border-l):
    Preview header: "Preview" label
    <CustomViewRenderer code={compiledCode} rows={previewRows} fields={fields} collectionName={collection.name} ... />
    Or error state if compiledCode is null

Bottom error bar (if errors): red background, mono text showing compilation errors

Starter template default value:
  `export default function MyView({ rows, fields, onRowClick }) {
  const primaryField = fields.find(f => f.is_primary);
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">{rows.length} rows</h2>
      <div className="space-y-2">
        {rows.map(row => (
          <div
            key={row.id}
            onClick={() => onRowClick(row.id)}
            className="p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
          >
            {String(row.data[primaryField?.slug ?? ''] ?? 'Untitled')}
          </div>
        ))}
      </div>
    </div>
  );
}`

Compilation (on save or Cmd+S):
  import Babel from '@babel/standalone'
  
  async function compile(sourceCode: string): Promise<{ code: string | null, error: string | null }> {
    try {
      const result = Babel.transform(sourceCode, {
        presets: ['react', 'typescript'],
        filename: 'custom-view.tsx',
      })
      return { code: result.code ?? null, error: null }
    } catch (err) {
      return { code: null, error: String(err) }
    }
  }

  On save:
    const { code, error } = await compile(editorCode)
    if (error): setCompileError(error), don't save
    if (code): setCompiledCode(code), save to DB

STEP 5 — Create src/hooks/useCustomViews.ts:
  useCustomViews(): fetch all from custom_views_registry for user
  useCreateCustomView(): insert with name, code, compiled_code
  useUpdateCustomView(): update code, compiled_code, name, description
  useDeleteCustomView(): delete by id
  
  useAssignCustomView(customViewId, collectionId):
    Create a new view row: { collection_id: collectionId, type: 'custom', name: 'Custom view', custom_view_id: customViewId, config: DEFAULT_VIEW_CONFIG }

STEP 6 — Add editor routes in App.tsx:
  /c/:slug/views/custom/new → CustomViewEditorPage
  /c/:slug/views/custom/:viewId/edit → CustomViewEditorPage (load existing code)

Create CustomViewEditorPage.tsx:
  Full page. Fetches collection + view data.
  In new mode: loads with starter template, on first save: useCreateCustomView + useAssignCustomView.
  In edit mode: loads existing code from custom_views_registry.

STEP 7 — Wire into CollectionPage:
  activeView.type === 'custom' → render CustomViewRenderer with the view's stored compiled_code
  View tabs show </> icon for custom type

VERIFY: Open editor at /c/my-collection/views/custom/new. Write a simple component. Cmd+S compiles. Preview shows live component with real collection data. Save stores to DB. Custom view appears as a tab.
```

---

#### TASK 3.2 — Custom View Registry & Management

**What it builds:** Custom view registry in Settings, export/import, assign to multiple collections, example templates, error recovery.
**Depends on:** Task 3.1
**Files created:** `src/pages/SettingsPage.tsx` (updated), `src/components/views/CustomView/CustomViewEditorPage.tsx` (enhanced)

**Cursor Prompt:**
```
Build the custom view registry and management features.

STEP 1 — Add "Custom Views" tab to Settings page:
A new 5th tab after Danger Zone. (Or move Danger Zone to be last.)

Table of custom views:
  Columns: Name | Description | Assigned to | Created | Actions
  
  For each custom view in useCustomViews():
  - Name (clickable → navigate to editor)
  - Description (text-kern-text-2, truncate)
  - "Assigned to": list collection names where a view with custom_view_id = this view's id exists
  - Created: formatRelativeTime
  - Actions row:
    - Edit button (Pencil icon) → navigate to /c/:firstAssignedSlug/views/custom/:viewId/edit
    - Assign button (Link icon) → opens AssignModal
    - Export button (Download icon) → download as JSON
    - Delete button (Trash2 icon, danger) → confirm dialog

"+ Import view" button at top right of the tab:
  Opens a file picker (accept=".json")
  Reads file, parses JSON
  Validates: must have { name: string, code: string }
  Calls useCreateCustomView({ name, description: parsed.description, code, compiled_code: null })
  Then triggers compilation of the imported code
  Success toast

STEP 2 — Create AssignModal component:
Modal with list of all user's collections (checkboxes).
Pre-checks collections that already have a view with this custom_view_id.

On save:
  For newly checked: useAssignCustomView(customViewId, collectionId)
  For newly unchecked: delete the view row (useDeleteView for that specific view id)

STEP 3 — Export functionality:
"Export" button triggers:
  const exportData = JSON.stringify({ name: view.name, description: view.description, code: view.code }, null, 2)
  const blob = new Blob([exportData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(view.name)}.kern-view.json`
  a.click()
  URL.revokeObjectURL(url)

STEP 4 — Auto-save in editor:
In CustomViewEditorPage:
  useEffect that runs every 30 seconds if hasUnsavedChanges:
    Call save function (compile + save to DB)
    setStatus('autosaved')
    setTimeout(() => setStatus('saved'), 2000)

Status indicator states:
  'idle': show nothing
  'unsaved': "Unsaved changes •" in amber
  'saving': "Saving..."
  'saved': "Saved ✓" (fades after 2s)
  'autosaved': "Autosaved" (fades after 2s)
  'error': "Error [N]" in red

STEP 5 — Add example templates dropdown in editor:
"Examples" dropdown button in editor top bar:

List of built-in examples:
  1. "Habit Heatmap" — GitHub-style contribution grid
     Code: full working heatmap component (from PRD section 18.4)
  
  2. "Expense Pie Chart" — Recharts pie chart grouped by category
     Code: full working chart (from PRD section 18.4)
  
  3. "Progress Dashboard" — Shows number fields as progress bars in a card grid
     Code: write a component that renders a grid of cards, one per row, with progress bars for any number fields
  
  4. "Timeline View" — Shows date fields on a vertical timeline
     Code: write a component that sorts rows by date and renders a vertical timeline with dots and text

Click example:
  If editor has code (beyond the starter template): confirm dialog "Replace current code?"
  Load example code into Monaco editor

STEP 6 — Error recovery in CustomViewRenderer:
Add an error boundary around the iframe + display:
  If iframe loads but throws an error (onError on iframe):
    Show error state:
      Red border on the preview panel
      Error icon + "View render error"
      Short error message if available
      "Fix in editor" button → highlights the Monaco editor (scroll to first error)
  
  If compiled_code is null (no saved compilation):
    Show: "This view hasn't been compiled yet. Open the editor to compile and save."
    "Open editor" button

VERIFY: Custom views appear in settings. Export downloads a .kern-view.json. Import loads a custom view. Assign modal assigns to multiple collections. Auto-save fires every 30 seconds. Examples load into the editor.
```

---

#### TASK 3.3 — Production Deployment

**What it builds:** Production Supabase project, Vercel deployment, all OAuth redirect URLs configured, Sentry error tracking.
**Depends on:** Task 3.2
**Files created:** `vercel.json`, `.env.production.example`

**Cursor Prompt:**
```
Deploy Kern to production on Vercel.

STEP 1 — Prepare for production build:
Verify: npm run build completes without errors or TypeScript issues.
Fix any build warnings (unused imports, etc.).

Update vite.config.ts:
  build: {
    sourcemap: false,  // Don't expose source in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          tanstack: ['@tanstack/react-query', '@tanstack/react-table', '@tanstack/react-virtual'],
          radix: ['@radix-ui/react-dialog', '@radix-ui/react-popover'] // etc.
        }
      }
    }
  }

STEP 2 — Create vercel.json in project root:
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}

STEP 3 — Create production Supabase project:
  1. Go to supabase.com → New project → name: kern-prod, region: Southeast Asia
  2. Get the connection string and run all migrations:
     supabase db push --db-url postgresql://...
  3. Configure Auth in Supabase dashboard:
     Site URL: https://kern.yourdomain.com
     Redirect URLs: https://kern.yourdomain.com/**, https://kern.yourdomain.com/oauth/callback/*
  4. Create Storage buckets in production (run the migration or do via dashboard)

STEP 4 — Deploy to Vercel:
  npm install -g vercel
  vercel          → follow prompts, link to your account
  
  Set environment variables in Vercel dashboard → Project → Settings → Environment Variables:
    VITE_SUPABASE_URL = <production project URL>
    VITE_SUPABASE_ANON_KEY = <production anon key>

STEP 5 — Deploy Supabase Edge Functions to production:
  supabase functions deploy kern-mcp --project-ref <prod-project-ref>
  supabase functions deploy sync-github --project-ref <prod-project-ref>
  supabase functions deploy sync-google-calendar --project-ref <prod-project-ref>
  supabase functions deploy sync-notion --project-ref <prod-project-ref>
  supabase functions deploy sync-linear --project-ref <prod-project-ref>
  supabase functions deploy sync-rss --project-ref <prod-project-ref>
  supabase functions deploy oauth-callback-github --project-ref <prod-project-ref>
  supabase functions deploy oauth-callback-google --project-ref <prod-project-ref>
  supabase functions deploy oauth-callback-notion --project-ref <prod-project-ref>
  supabase functions deploy oauth-callback-linear --project-ref <prod-project-ref>
  
  Set production secrets:
  supabase secrets set --project-ref <ref> GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=... GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... NOTION_CLIENT_ID=... NOTION_CLIENT_SECRET=... LINEAR_CLIENT_ID=... LINEAR_CLIENT_SECRET=... ENCRYPTION_KEY=<32-char-random-string> SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>

STEP 6 — Update OAuth App redirect URIs for production:
  GitHub OAuth App: Add https://kern.yourdomain.com/oauth/callback/github as callback URL
  Google Cloud Console: Add https://kern.yourdomain.com/oauth/callback/google
  Notion Integration: Add https://kern.yourdomain.com/oauth/callback/notion
  Linear OAuth App: Add https://kern.yourdomain.com/oauth/callback/linear

STEP 7 — Install and configure Sentry:
  npm install @sentry/react
  
  In src/main.tsx, before ReactDOM.createRoot:
  import * as Sentry from '@sentry/react';
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
      environment: 'production',
    });
  }
  
  Add VITE_SENTRY_DSN to Vercel env vars (create free Sentry account to get DSN).

STEP 8 — Create .env.production.example (commit this):
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your_anon_key
  VITE_SENTRY_DSN=https://...@sentry.io/...

STEP 9 — Production smoke test checklist:
  [ ] https://kern.yourdomain.com loads
  [ ] Sign up with new account on production
  [ ] Create a collection, add fields, add 5 rows
  [ ] Switch to Kanban view, drag a card
  [ ] Connect a GitHub live source, verify sync
  [ ] Add MCP server URL to Claude.ai, ask "What collections do I have in Kern?"
  [ ] Open custom view editor, write a component, see it render
  [ ] Check Sentry dashboard for any errors

KERN IS LIVE IN PRODUCTION AFTER THIS TASK.
```

---

#### TASK 3.4 — Final Polish & Remaining Features

**What it builds:** CSV export, duplicate collection, onboarding, all remaining gaps, production readiness.
**Depends on:** Task 3.3
**Files created:** Various small additions across the codebase

**Cursor Prompt:**
```
Final polish pass for Kern — complete all remaining features and fix all gaps.

STEP 1 — Complete CSV export:
In CollectionActionsMenu "Export as CSV":

async function exportAsCSV(collection: KernCollection, fields: KernField[]) {
  // Fetch ALL rows (no pagination limit)
  const { data: rows } = await supabase.from('rows').select('*').eq('collection_id', collection.id).order('sort_order')
  
  // Build header row
  const headers = fields.map(f => f.name)
  
  // Build data rows
  const csvRows = (rows ?? []).map(row => 
    fields.map(field => {
      const value = row.data[field.slug]
      if (value === null || value === undefined) return ''
      
      switch(field.type) {
        case 'select': {
          const options = (field.options as SelectFieldOptions)?.items ?? []
          return options.find(o => o.id === value)?.label ?? String(value)
        }
        case 'multi_select': {
          const options = (field.options as SelectFieldOptions)?.items ?? []
          const ids = value as string[]
          return ids.map(id => options.find(o => o.id === id)?.label ?? id).join(', ')
        }
        case 'boolean': return value ? 'Yes' : 'No'
        case 'file': {
          const files = value as Array<{ name: string }>
          return files.map(f => f.name).join(', ')
        }
        default: return String(value)
      }
    })
  )
  
  // Convert to CSV string
  const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...csvRows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')
  
  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collection.slug}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

Wire to CollectionActionsMenu "Export as CSV" item.

STEP 2 — Duplicate collection:
In CollectionActionsMenu "Duplicate":

async function duplicateCollection(collection: KernCollection, fields: KernField[]) {
  const newSlug = `${collection.slug}-copy-${Date.now()}`
  const { data: newCollection } = await supabase.from('collections').insert({
    name: `${collection.name} (copy)`, slug: newSlug, icon: collection.icon, color: collection.color, description: collection.description, user_id: userId, sort_order: collection.sort_order + 0.5
  }).select().single()
  
  if (!newCollection) return
  
  // Copy all fields (new IDs, same slugs)
  for (const field of fields) {
    await supabase.from('fields').insert({
      collection_id: newCollection.id, user_id: userId, name: field.name, slug: field.slug,
      type: field.type, options: field.options, is_required: field.is_required, is_primary: field.is_primary, sort_order: field.sort_order
    })
  }
  
  queryClient.invalidateQueries({ queryKey: ['collections', userId] })
  toast.success(`${collection.name} duplicated`)
  navigate(`/c/${newSlug}`)
}

STEP 3 — Onboarding for new users:
On first sign-up (profile just created, no collections exist):

Show a welcome modal (auto-opens, not dismissable until creating first collection):
  Title: "Welcome to Kern"
  Subtitle: "You define the structure. Let's create your first collection."
  
  Quick-start options (3 cards):
    "Books & Reading" — 📚 green — auto-creates a Books collection with: Title (text, primary), Author (text), Status (select: to-read/reading/read), Rating (number, 0-5), Date Finished (date)
    "Tasks & Projects" — 🎯 indigo — creates Tasks: Title, Status (select: todo/in-progress/done), Due Date, Priority (select: low/medium/high)
    "Start from scratch" — 📦 gray — opens Create Collection modal
  
  On click: create the collection, navigate to it, close modal
  Track onboarded state: set profiles.preferences.onboarded = true after first collection created

STEP 4 — Search within a collection:
Add a search input to the Collection header (after the view tabs, before filter/sort):
  Magnifying glass icon → click to expand search input (or always visible, 160px)
  Input: "Search rows..." placeholder
  Typing: filters rows client-side (or server-side .ilike) by searching primary field value
  This is separate from and simpler than the view filters system
  Clear button (X) when text present
  
  Add to useRows a searchQuery parameter:
  In the query's select function: if searchQuery, further filter by rows where primary field value contains the query

STEP 5 — Keyboard shortcut improvements:
In Collection page, implement keyboard navigation for the table:
  Up/Down arrows (when not in an input): move row focus
  Keep track of focusedRowIndex in local state
  Focused row: subtle highlight (bg-kern-accent/5)
  Enter on focused row: appStore.openRow
  
  In Cmd+K palette, add shortcut hints that actually work:
  G then D = navigate to Dashboard (using a "chord" keyboard shortcut system):
    useEffect that listens for 'g' keypress, then starts a 500ms window for the next key
    'g' → 'd' = /dashboard, 'g' → 's' = /settings, etc.

STEP 6 — Final accessibility improvements:
  All interactive elements must have proper aria-label or visible text
  Focus visible outlines on all buttons/inputs (use focus-visible: classes in Tailwind)
  Modal focus trap (Radix handles this automatically)
  Keyboard-accessible dropdown menus (Radix handles this)
  Check: tab through the app without a mouse — should work everywhere

STEP 7 — Write README.md:
A comprehensive README covering:
  - What Kern is (one paragraph from PRD)
  - Tech stack
  - Local development setup (step by step):
    - Prerequisites: Node 18+, Supabase CLI
    - Clone, npm install, supabase start, supabase db push, npm run dev
  - Environment variables (copy .env.example)
  - Creating your first collection
  - Connecting a live source
  - Using Claude MCP
  - Writing custom views
  - Deploying to production (brief, link to Vercel + Supabase docs)

FINAL CHECKLIST — verify everything before shipping:
  [ ] App loads in < 2 seconds on fast connection
  [ ] All 5 view types work (table, kanban, calendar, gallery, list)
  [ ] Cmd+K has all expected commands
  [ ] GitHub sync works end-to-end
  [ ] MCP server responds to Claude
  [ ] Custom view editor compiles and renders
  [ ] All modals close on Escape
  [ ] Theme toggle (light/dark) works
  [ ] CSV export downloads correctly
  [ ] No TypeScript errors (npx tsc --noEmit)
  [ ] Production deployment green

KERN IS COMPLETE.
```

---

## QUICK REFERENCE

### Task Dependency Map

```
1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10
                                                              ↓
                                                  1.11 → 1.12 → 1.13 → 1.14 → 1.15 → 1.16
                                                                                          ↓
                                          2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7
                                                                                  ↓
                                                              3.1 → 3.2 → 3.3 → 3.4
```

### Files Created Per Task

```
1.1  package.json, tsconfig, tailwind, vite, .env files
1.2  supabase/migrations/* (all 11), src/types/database.ts, src/types/kern.ts, src/lib/*
1.3  AuthProvider, QueryProvider, ThemeProvider, ProtectedRoute, Login/Signup/App.tsx
1.4  appStore, AppShell, Topbar, Sidebar, UserMenu, Button, Input, Skeleton, EmptyState
1.5  useCollections, SidebarCollectionItem, updated Sidebar, CollectionPage (basic)
1.6  Modal, EmojiPicker, ColorPicker, Popover, DropdownMenu, Create/Edit/Delete modals
1.7  useFields, FieldTypeIcon, FieldTypeGrid, SelectOptionsEditor, FieldPanel
1.8  useRows, useViews, CollectionHeader, ViewTabs, FilterBar, SortBar, FieldsMenu
1.9  All cells/* components, TableView, ColumnHeader, BulkActionBar, RowContextMenu
1.10 useRelations, RowEditorPanel, RelationPicker, RelationPill, ReferencedBySection
1.11 KanbanView, KanbanColumn, KanbanCard
1.12 field-operators, apply-filters, apply-sorts, updated useRows + filter/sort bars
1.13 commandStore, useCommandRegistry, CommandPalette, CommandItem
1.14 useDashboard, Dashboard, WidgetWrapper, AddWidgetModal, all 5 widget components
1.15 SettingsPage (full), KeyboardShortcutsModal
1.16 ErrorBoundary, polish across all files
2.1  supabase/functions/kern-mcp/* (complete MCP server)
2.2  crypto.ts, sync-github, ConnectLiveSourceModal, LiveSourceBadge, GitHubSourceConfig
2.3  sync-google-calendar, sync-rss, source config components
2.4  CalendarView, CalendarMonth, GalleryView, GalleryCard, ListView (complete)
2.5  useFileUpload, FileCell (full), RowEditor file field (full), avatar upload
2.6  sync-notion, sync-linear, NotionSourceConfig, LinearSourceConfig
2.7  Realtime subscriptions, debounced saves, prefetching, memoization
3.1  custom-view-types.ts, CustomViewRenderer, CustomViewEditor, useCustomViews
3.2  Settings custom views tab, AssignModal, export/import, auto-save, examples
3.3  vercel.json, production deploy, Sentry
3.4  CSV export, duplicate collection, onboarding, search, README
```

---

*Kern Build Prompts v2.0*
*16 Phase 1 tasks · 7 Phase 2 tasks · 4 Phase 3 tasks = 27 total Cursor prompts*
*Each prompt is one Cursor session. Complete in order. Reference KERN_PRD_SPEC.md for all type definitions and architecture decisions.*