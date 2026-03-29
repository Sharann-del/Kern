# Kern

Kern is a keyboard-driven, code-extensible personal data operating system. You define **collections** (structured tables), connect **live sources** (GitHub, Notion, Linear, Google Calendar, and more), view data with built-in views or **custom React views**, and control the app from **Cmd+K**. You can connect Claude to your workspace via **MCP**. Data lives in your own Supabase project; this repo is the web app that runs against that backend.

The full specification is in [Kern PRD.md](../Kern%20PRD.md) at the repository root.

## Tech stack

- **Frontend:** React 18+, Vite 5+, TypeScript (`strict`), Tailwind CSS, Radix UI, TanStack Query v5, TanStack Table, Zustand, React Router v6
- **Backend:** Supabase (Postgres, Auth, Row Level Security, Edge Functions, Realtime)

## Prerequisites

- **Node.js** 18 or newer
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/cli))

## Local development

From this directory (`kern/`):

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` (or `.env`) and set at least:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   See [.env.example](.env.example) for OAuth client IDs, Edge Function secrets, and MCP-related notes.

3. **Start Supabase locally** (from `kern/` if your `supabase` folder is here, or from the repo root if configured there—use the same directory where `supabase/config.toml` lives)

   ```bash
   supabase start
   ```

4. **Apply database migrations**

   ```bash
   supabase db push
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   The Vite dev server defaults to `http://localhost:5173`.

Use a **local** Supabase instance when developing against `supabase start`; point `VITE_SUPABASE_*` at that project’s URL and anon key from the CLI output.

## Creating your first collection

After sign-in, use the onboarding choices or **New collection** (sidebar or **Cmd+N**). Define fields in the field panel; the collection page seeds a default table view. Add rows from the table or other views.

## Connecting a live source

Open a collection → **Connect live source**, choose a provider, complete OAuth where required, and configure sync. Register redirect URIs with your OAuth apps as documented in `.env.example`.

## Using Claude MCP

Configure your MCP client (e.g. Cursor) with your deployed **kern-mcp** Edge Function URL, Supabase anon key, and a **Kern access token** from Settings in the app. See comments in [.env.example](.env.example) for `KERN_MCP_URL`, `KERN_SUPABASE_ANON_KEY`, and `KERN_ACCESS_TOKEN`. Full behavior is specified in the PRD MCP section.

## Custom views

Collections support a **custom** view type: React-like code is edited in the in-app editor, compiled, and rendered in a sandboxed iframe with the props contract described in the PRD (`rows`, `fields`, mutations, etc.).

## Production deployment

- **Frontend:** Deploy the Vite app to a host such as [Vercel](https://vercel.com/docs) (build command `npm run build`, output `dist`).
- **Backend:** Use a hosted Supabase project; run migrations against it, deploy Edge Functions, and set [secrets](https://supabase.com/docs/guides/functions/secrets) for OAuth and encryption.

Refer to the official [Supabase docs](https://supabase.com/docs) for projects, auth, and Edge Functions.

## Scripts

| Command            | Description                |
| ------------------ | -------------------------- |
| `npm run dev`      | Start Vite dev server      |
| `npm run build`    | Production build           |
| `npm run preview`  | Preview production build   |
| `npm run lint`     | ESLint                     |

## Keyboard shortcuts (high level)

- **Cmd+K** (Ctrl+K): command palette  
- **Cmd+N**: new collection  
- **G** then **D**: dashboard  
- **G** then **S**: settings  

More shortcuts are listed in the in-app **Keyboard shortcuts** modal.
