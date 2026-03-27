# KERN — Frontend Redesign Prompts
### 3 Cursor sessions. Complete the design system and every surface.
### Run in order. Verify after each before proceeding.

---

## BEFORE YOU START — Paste this into every session

```
We are redesigning the frontend of Kern — a personal data OS built in React + Vite + TypeScript + Tailwind CSS + Supabase.

Design system (memorize this, apply it everywhere, never deviate):

FONTS (already loaded via Google Fonts in index.html):
  Display/headings: "Instrument Serif" — italic, editorial, confident
  Body/UI: "DM Sans" — clean, readable, professional
  Mono: "Geist Mono" — code, IDs, slugs, technical values

COLOR TOKENS (already in CSS variables):
  --bg-0: #0a0a0a   (page background)
  --bg-1: #111111   (sidebar, topbar, panels)
  --bg-2: #1a1a1a   (cards, inputs, surfaces)
  --bg-3: #222222   (hover states)
  --bg-4: #2a2a2a   (active, selected)
  --border-subtle: #1f1f1f
  --border-default: #2e2e2e
  --border-strong: #3d3d3d
  --text-primary: #f0f0f0
  --text-secondary: #888888
  --text-tertiary: #555555
  --text-placeholder: #3a3a3a
  --accent: #e8e8e8
  --accent-muted: #333333
  Semantic: --color-red #e05252, --color-green #52a869, --color-blue #4a7ce0,
            --color-purple #8b5cf6, --color-yellow #d4a847, --color-orange #e07842

RULES (never break these):
  - No gradients except the optional sidebar linear-gradient(180deg, #111111, #0d0d0d)
  - No rounded pill shapes. Max border-radius: 10px (--radius-lg), buttons use 4px
  - No box shadows on interactive elements. Shadows only on floating panels/modals
  - No colored accent buttons. Primary button = bg #e8e8e8, text #0a0a0a
  - Font weights: 400 body, 500 UI labels, 600 headings. Never 700+ except display titles in Instrument Serif
  - Icons: Lucide React. 14px inline, 16px sidebar, 18px toolbar
  - All transitions: 80ms ease (fast interactions), 150ms ease (panels, modals)
  - Borders are 1px solid only. No thick borders. No double borders.
  - Empty states and zero-data surfaces use Instrument Serif italic for the main message
  - Do not touch any business logic, hooks, or Supabase calls. CSS and component structure only.
  - Do not break any existing functionality. If unsure, keep the logic identical and only change styles.
```

---

## PROMPT 1 — Foundation Layer
### Shell, primitives, navigation chrome
### Files to touch: AppShell, Topbar, Sidebar, all ui/* components

```
FRONTEND REDESIGN — PROMPT 1 of 3
Reference the design system block above. Apply it to every file listed below.

This prompt covers the foundation: the persistent app chrome and all shared UI primitives.
Do not touch pages, views, or collection-specific components yet. Only what's listed here.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. src/index.css — Global base styles
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the body/html base styles with:

html, body, #root {
  height: 100%;
  background: #0a0a0a;
  color: #f0f0f0;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

Scrollbar — subtle, dark, 5px:
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3d3d3d; }
::-webkit-scrollbar-corner { background: transparent; }

Text selection:
::selection { background: #333333; color: #f0f0f0; }

Focus ring — keyboard only, no mouse focus rings:
:focus-visible { outline: 1px solid #3d3d3d; outline-offset: 2px; border-radius: 4px; }
:focus:not(:focus-visible) { outline: none; }

Disable default number input arrows:
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. src/components/ui/Button.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keep all props and logic identical. Only rewrite the className strings.

Variant styles (use cn() to merge):
  primary:   'bg-accent text-bg-0 hover:bg-[#d8d8d8] active:bg-[#c8c8c8] font-medium'
             (accent = #e8e8e8, text = #0a0a0a — this is the ONLY "colored" button)
  secondary: 'bg-bg-2 text-text-primary border border-border-default hover:bg-bg-3 active:bg-bg-4'
  ghost:     'bg-transparent text-text-secondary hover:bg-bg-3 hover:text-text-primary active:bg-bg-4'
  danger:    'bg-transparent text-c-red border border-border-default hover:bg-[#e05252]/10 hover:border-[#e05252]/40'

Size styles:
  sm:  'h-7 px-2.5 text-[12px] gap-1.5 rounded-[4px]'
  md:  'h-8 px-3   text-[13px] gap-2   rounded-[4px]'
  lg:  'h-9 px-4   text-[14px] gap-2   rounded-[4px]'

Shared base:
  'inline-flex items-center justify-center font-medium
   transition-colors duration-[80ms] ease-[ease]
   select-none whitespace-nowrap
   disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'

Loading state: show <Loader2 className="animate-spin" size={13} /> — do not show children text while loading.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. src/components/ui/Input.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input element:
  'w-full h-8 px-3
   bg-bg-2 text-[13px] text-text-primary
   border border-border-default rounded-[4px]
   placeholder:text-text-placeholder
   focus:outline-none focus:border-border-strong
   transition-colors duration-[80ms]
   disabled:opacity-40 disabled:cursor-not-allowed'

Label:
  'block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mb-1.5'

Error text:
  'mt-1.5 text-[11px] text-c-red leading-none'

Helper text:
  'mt-1.5 text-[11px] text-text-tertiary leading-none'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. src/components/ui/Modal.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overlay: 'fixed inset-0 bg-black/60 z-50'
  (no backdrop-blur — we don't blur on this design system)

Content container:
  'fixed z-50
   top-[18%] left-1/2 -translate-x-1/2
   w-full max-w-[500px] mx-4
   bg-bg-1
   border border-border-default
   rounded-[10px]
   shadow-[0_8px_32px_rgba(0,0,0,0.6)]'

Animation (Radix data attributes):
  data-[state=open]:animate-in
  data-[state=closed]:animate-out
  data-[state=open]:fade-in-0
  data-[state=closed]:fade-out-0
  data-[state=open]:zoom-in-[0.97]
  data-[state=closed]:zoom-out-[0.97]
  duration-150

Header:
  'flex items-start justify-between
   px-5 pt-5 pb-4
   border-b border-border-subtle'

  Title: use Instrument Serif
  'font-["Instrument_Serif"] italic text-[18px] text-text-primary leading-tight tracking-[-0.01em]'

  Close button: ghost sm variant, X icon 14px, positioned absolute top-3 right-3

Body: 'px-5 py-5'

Footer:
  'flex items-center justify-end gap-2
   px-5 pb-5 pt-4
   border-t border-border-subtle'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. src/components/ui/Popover.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PopoverContent:
  'bg-bg-2 border border-border-default rounded-[6px]
   shadow-[0_4px_12px_rgba(0,0,0,0.5)]
   z-50 outline-none
   data-[state=open]:animate-in data-[state=closed]:animate-out
   data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
   data-[state=open]:zoom-in-[0.97] data-[state=closed]:zoom-out-[0.97]
   duration-[80ms]'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. src/components/ui/DropdownMenu.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Content:
  'bg-bg-2 border border-border-default rounded-[6px]
   shadow-[0_4px_12px_rgba(0,0,0,0.5)]
   p-1 min-w-[180px] z-50
   data-[state=open]:animate-in data-[state=closed]:animate-out
   data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
   data-[state=open]:zoom-in-[0.97] duration-[80ms]'

Item:
  'relative flex items-center gap-2
   px-2 h-[28px] rounded-[4px]
   text-[13px] text-text-secondary
   cursor-default select-none outline-none
   transition-colors duration-[80ms]
   data-[highlighted]:bg-bg-3 data-[highlighted]:text-text-primary'

  Icon inside item: 'text-text-tertiary data-[highlighted]:text-text-secondary' size={14}

Separator: 'h-px bg-border-subtle my-0.5 mx-1'

Label (group header):
  'px-2 py-1.5
   text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary'

Danger item variant:
  'data-[highlighted]:bg-[#e05252]/10 data-[highlighted]:text-c-red text-c-red'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. src/components/ui/Skeleton.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Base skeleton:
  'bg-bg-2 rounded-[4px] animate-pulse'
  Animation: @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
  duration: 1.8s (slower than default, feels more intentional)

SkeletonText: 'h-[13px] bg-bg-2 rounded-[3px] animate-pulse'
SkeletonRow: 'h-[32px] bg-bg-2 rounded-[4px] animate-pulse'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. src/components/ui/EmptyState.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Container:
  'flex flex-col items-center justify-center
   gap-3 py-20 px-8 text-center
   select-none'

Icon: size={36}, 'text-text-tertiary mb-1'

Title: use Instrument Serif italic
  'font-["Instrument_Serif"] italic text-[20px] text-text-secondary
   leading-tight tracking-[-0.01em]'

Subtitle:
  'text-[13px] text-text-tertiary max-w-[260px] leading-relaxed'

Action button: secondary variant, sm size, mt-1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. src/components/ui/Kbd.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'inline-flex items-center px-1.5 py-0.5
 text-[10px] font-mono text-text-tertiary
 bg-bg-2 border border-border-default
 rounded-[3px] leading-none'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. src/components/ui/Badge.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If this component exists, rebuild it:
  Default: 'inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold
            uppercase tracking-[0.05em] rounded-[3px]
            bg-bg-3 text-text-tertiary border border-border-subtle'

  Dot variant (status indicator):
    '6px circle' + label text-[11px] text-text-secondary
    Color comes from a color prop (green, red, amber, blue, gray)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. src/components/layout/AppShell.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No logic changes. Only ensure:
  - Root div: 'h-screen w-screen overflow-hidden bg-bg-0 flex flex-col'
  - Main content area: 'flex-1 overflow-hidden flex'
  - The actual scrollable area (the outlet/page container):
    'flex-1 overflow-y-auto overflow-x-hidden bg-bg-0'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. src/components/layout/Topbar.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Container:
  'fixed top-0 left-0 right-0 z-50
   h-[44px] flex items-center px-3 gap-2
   bg-bg-1 border-b border-border-subtle'

Sidebar toggle button:
  ghost sm, PanelLeft icon 16px
  'text-text-tertiary hover:text-text-secondary'

Logo/wordmark (the "kern" text):
  'font-["Instrument_Serif"] italic text-[17px] text-text-primary
   tracking-[-0.02em] leading-none select-none ml-1'
  NOT monospace. NOT colored. Just clean dark italic serif.

Breadcrumb (when inside a collection):
  Separator: 'text-text-tertiary text-[13px] mx-1' showing "/"
  Collection name: 'text-[13px] text-text-secondary font-medium'
  Fade in with opacity transition when collection is active

Right side:
  'ml-auto flex items-center gap-1'
  User avatar button: ghost variant, 28px height

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. src/components/layout/UserMenu.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Avatar trigger:
  'flex items-center gap-2 px-2 h-7 rounded-[4px]
   text-text-secondary hover:bg-bg-3 hover:text-text-primary
   transition-colors duration-[80ms]'

  Avatar circle: 22px, 'bg-bg-3 border border-border-default rounded-full
                         text-[10px] font-semibold text-text-secondary
                         flex items-center justify-center shrink-0'

  Show name or email (first 14 chars) to the right of avatar in text-[12px]

Dropdown:
  User info header:
    'px-2 py-2 border-b border-border-subtle mb-1'
    Name: 'text-[13px] font-medium text-text-primary'
    Email: 'text-[11px] text-text-tertiary mt-0.5'

  Items: Settings (Settings icon), Keyboard shortcuts (Command icon), separator, Sign out (LogOut icon)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. src/components/layout/Sidebar.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Container:
  'fixed left-0 z-40
   flex flex-col
   bg-bg-1 border-r border-border-subtle
   transition-[width] duration-[150ms] ease-[ease]
   overflow-hidden select-none'

  top: 44px (below topbar), bottom: 0
  width: 220px expanded, 44px collapsed

Optional subtle gradient:
  background: 'linear-gradient(180deg, #111111 0%, #0d0d0d 100%)'

Section labels (when expanded):
  'px-3 pt-4 pb-1
   text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary'

Section label row (label + action button side by side):
  'flex items-center justify-between pr-1'
  "+" button: ghost 20px, Plus icon 12px, opacity-0 group-hover:opacity-100

Navigation items (Dashboard, etc.):
  'flex items-center gap-2.5
   h-[30px] px-2.5 mx-1.5 rounded-[4px]
   text-[13px] font-medium text-text-secondary
   cursor-pointer transition-colors duration-[80ms]
   hover:bg-bg-3 hover:text-text-primary'

  Active: 'bg-bg-3 text-text-primary'
  Icon: 16px, 'text-text-tertiary'
  Active icon: 'text-text-primary'

Dividers: 'h-px bg-border-subtle mx-3 my-1'

New collection button (bottom of sidebar):
  When expanded:
    'flex items-center gap-2 h-[30px] px-3 mx-1.5 mb-2 rounded-[4px]
     text-[12px] text-text-tertiary
     hover:bg-bg-3 hover:text-text-secondary
     transition-colors duration-[80ms] cursor-pointer'
    Plus icon 13px

  When collapsed:
    Just the Plus icon centered, same hover

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15. src/components/layout/SidebarCollectionItem.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Item container:
  'group flex items-center gap-2
   h-[28px] px-2 mx-1.5 rounded-[4px]
   cursor-pointer transition-colors duration-[80ms]
   hover:bg-bg-3'

  Active: 'bg-bg-3'

Drag handle:
  GripVertical icon 13px
  'text-text-tertiary opacity-0 group-hover:opacity-40 shrink-0
   cursor-grab active:cursor-grabbing'
  Hidden when sidebar is collapsed

Emoji icon:
  'text-[13px] leading-none shrink-0'
  If no emoji: 4px colored square using collection.color, 'rounded-[2px] w-3 h-3 shrink-0'

Name:
  'text-[13px] text-text-secondary flex-1 truncate
   group-hover:text-text-primary transition-colors duration-[80ms]'
  Active: 'text-text-primary'

Row count:
  'text-[11px] text-text-tertiary ml-auto shrink-0 font-mono'
  Only show when count > 0, hide when ⋯ button is visible

⋯ button:
  'opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms]
   text-text-tertiary hover:text-text-primary'
  MoreHorizontal icon 13px, ghost 20px size

When collapsed: only show emoji/color swatch, use Tooltip for name

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16. src/components/ui/Tooltip.tsx (create or update)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Radix Tooltip wrapper.
Content:
  'bg-bg-4 text-text-primary text-[11px] font-medium
   px-2 py-1 rounded-[4px]
   border border-border-strong
   shadow-sm
   z-50 select-none'

Arrow: 'fill-bg-4'
Delay: 400ms open, 0ms close

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY after this prompt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] App loads without errors
- [ ] Sidebar is dark, clean, correct width and collapse behavior
- [ ] Topbar shows "kern" in italic serif, correct height
- [ ] All buttons match their variant specs
- [ ] Modals are dark with Instrument Serif title
- [ ] Empty states use italic serif for the main message
- [ ] No white backgrounds anywhere
- [ ] No blue/colored buttons (only white primary button)
```

---

## PROMPT 2 — Collection Surface
### Everything inside a collection: header, views, table, kanban, cells, row editor, field panel
### Run AFTER Prompt 1 is verified

```
FRONTEND REDESIGN — PROMPT 2 of 3
Reference the design system block above. Apply it to every file listed.

This prompt covers the collection surface — everything a user sees when working with data.
Do not touch the sidebar/topbar (done in Prompt 1). Do not touch the dashboard or settings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. src/components/collection/CollectionHeader.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The collection header has two rows:

TOP ROW (h-[44px]):
  'flex items-center gap-3 px-5
   bg-bg-1 border-b border-border-subtle'

  Left:
    Emoji icon: text-[15px] leading-none
    Collection name:
      'text-[15px] font-semibold text-text-primary tracking-[-0.01em]'
    Live source badge (if applicable): inline after name

  Right: CollectionActionsMenu trigger, ⋯ icon ghost sm

BOTTOM ROW / VIEW TABS ROW (h-[36px]):
  'flex items-center px-4 gap-0
   bg-bg-0 border-b border-border-subtle'

  Each view tab:
    'flex items-center gap-1.5
     h-full px-3 text-[12px] font-medium
     text-text-tertiary border-b-[2px] border-b-transparent
     cursor-pointer select-none
     transition-colors duration-[80ms]
     hover:text-text-secondary'

    Active tab:
      'text-text-primary border-b-[2px] border-b-[#e8e8e8]'

    Tab icon: 13px, 'opacity-60'
    Active tab icon: 'opacity-100'

  Spacer: 'flex-1'

  Right side buttons (Filter, Sort, Fields, Options):
    ghost sm variant
    'text-[12px] gap-1.5'
    When active (has filters/sorts): 'bg-accent-muted text-text-primary border border-border-default'
    Count badge (when filters active):
      'ml-1 text-[10px] bg-bg-4 text-text-secondary
       px-1 rounded-[3px] font-mono'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. src/components/views/TableView/TableView.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Table wrapper:
  'w-full h-full overflow-auto bg-bg-0'

Column header row:
  'sticky top-0 z-10 flex
   bg-bg-1 border-b border-border-default'

Each column header cell:
  'flex items-center gap-1.5
   h-[32px] px-3 shrink-0
   text-[11px] font-semibold uppercase tracking-[0.05em]
   text-text-tertiary
   border-r border-border-subtle
   cursor-pointer select-none
   hover:bg-bg-2 transition-colors duration-[80ms]'

  Sort indicator: ArrowUp/ArrowDown 11px, 'text-text-secondary'
  Resize handle: 'absolute right-0 top-1 bottom-1 w-[3px] cursor-col-resize opacity-0 hover:opacity-100 bg-border-strong rounded-full'

Data rows (height 34px):
  'flex border-b border-border-subtle
   hover:bg-bg-2 group transition-colors duration-[80ms]'

  Focused row: 'bg-bg-2'

Each data cell:
  'flex items-center px-3 h-full shrink-0
   text-[13px] text-text-primary
   border-r border-border-subtle
   overflow-hidden'

  Editing state (inline):
    Do not change the cell background.
    Add: 'ring-1 ring-inset ring-border-strong'
    Input inside: 'w-full h-full bg-transparent outline-none text-[13px] text-text-primary'

Checkbox column (first column, width 40px):
  'flex items-center justify-center px-0 border-r border-border-subtle'
  Radix Checkbox:
    'w-[14px] h-[14px] rounded-[3px]
     border border-border-default bg-transparent
     data-[state=checked]:bg-accent data-[state=checked]:border-accent
     transition-colors duration-[80ms]'
  Checkmark: 'text-bg-0' (dark on light accent)

"+ New row" row (last visible row):
  'flex items-center h-[34px] px-[52px]
   text-[13px] text-text-tertiary
   hover:bg-bg-2 cursor-pointer
   transition-colors duration-[80ms]
   border-b border-border-subtle group'
  Plus icon: 12px, 'text-text-tertiary group-hover:text-text-secondary'
  Text: "New row" in text-text-tertiary

Row hover actions (appear on row hover):
  Expand button (↗): 'absolute right-2 opacity-0 group-hover:opacity-100'
    ArrowUpRight icon 12px, ghost 24px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. src/components/cells/* — all cell components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All cells share a display-mode base:
  'w-full h-full flex items-center px-3 text-[13px] truncate'

TextCell display: 'text-text-primary'
TextCell empty: 'text-text-placeholder'
TextCell editing: transparent input, no bg change, ring-inset ring-border-strong on the CELL not the input

NumberCell: 'text-text-primary font-mono text-[12px] tabular-nums'
NumberCell unit: 'text-text-tertiary ml-1 text-[11px]'
NumberCell progress bar:
  Track: 'w-full h-[3px] bg-bg-3 rounded-full'
  Fill: 'h-full bg-text-primary rounded-full'

DateCell display: 'text-[13px] text-text-secondary'
DateCell "Today": 'text-[#52a869]'
DateCell "Yesterday"/"Tomorrow": 'text-text-secondary'
DateCell overdue: 'text-[#e05252]'

BooleanCell:
  Same Radix Checkbox as table header checkbox
  Centered in cell

SelectCell pill:
  'inline-flex items-center px-2 py-0.5
   text-[11px] font-medium rounded-[3px]
   leading-none'
  Background = option.color + '20' (20% opacity hex)
  Text = option.color (full color)
  Border = option.color + '40'

MultiSelectCell: flex-wrap gap-1, same pill style, overflow "+N" in text-text-tertiary text-[11px]

UrlCell: 'text-[#4a7ce0] text-[13px]'
  ExternalLink icon: 11px, 'opacity-0 group-hover:opacity-100 ml-1'

EmailCell: 'text-text-secondary text-[13px]'
RelationCell pills:
  'inline-flex items-center gap-1
   px-2 py-0.5 text-[11px] text-text-secondary
   border border-border-default rounded-[3px]
   bg-bg-2 hover:bg-bg-3 cursor-pointer
   transition-colors duration-[80ms]'

FileCell: 'text-[12px] text-text-secondary gap-1.5'
  Paperclip icon: 11px, text-text-tertiary

Calendar (DateCell popover):
  bg-bg-2 border border-border-default rounded-[6px] shadow-md p-3
  Month header: DM Sans text-[13px] font-medium text-text-primary
  Day grid:
    Day headers: text-[10px] uppercase tracking-wide text-text-tertiary
    Day buttons: 'w-7 h-7 text-[12px] rounded-[4px] hover:bg-bg-3 text-text-secondary'
    Today: 'border border-border-strong text-text-primary'
    Selected: 'bg-accent text-bg-0'
    Outside month: 'text-text-tertiary opacity-40'

Select option dropdown (SelectCell popover):
  Same popover base
  Each option:
    'flex items-center gap-2 px-2 h-[28px] rounded-[4px]
     cursor-pointer hover:bg-bg-3'
  Search input: same Input styles, h-7 at top of popover

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. src/components/views/TableView/TableColumnHeader.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Right-click context menu (DropdownMenu):
  Same dropdown styles as global DropdownMenu
  "Delete field" is the danger variant (red text)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. src/components/views/KanbanView/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KanbanView wrapper:
  'flex gap-3 h-full overflow-x-auto p-4 bg-bg-0'

KanbanColumn:
  Container:
    'flex flex-col shrink-0 w-[264px]
     bg-bg-1 rounded-[8px] border border-border-subtle'

  Header:
    'flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle'
    Status dot: 6px circle, option.color
    Column name: 'text-[12px] font-semibold text-text-secondary uppercase tracking-[0.05em]'
    Count: 'ml-auto text-[11px] text-text-tertiary font-mono'
    Collapse button: ChevronLeft 13px, ghost 24px

  Cards area: 'flex flex-col gap-2 p-2 flex-1 overflow-y-auto'

  Collapsed state:
    width: 36px
    header rotated: rotate-180, writing-mode: vertical-lr

  "Add card" footer:
    'flex items-center gap-1.5 p-2 mt-1
     text-[12px] text-text-tertiary cursor-pointer
     hover:text-text-secondary rounded-[6px] hover:bg-bg-2
     transition-colors duration-[80ms]'
    Plus icon 13px

KanbanCard:
  'bg-bg-2 rounded-[6px] border border-border-default
   p-3 cursor-pointer
   hover:border-border-strong hover:bg-bg-3
   transition-all duration-[80ms]
   group'

  Dragging state: 'opacity-50 rotate-[1deg] scale-[1.02]'

  Title: 'text-[13px] font-medium text-text-primary leading-snug'
  Secondary fields: 'mt-2 space-y-1'
    Each: 'flex items-center gap-1.5 text-[11px] text-text-tertiary'
    Field icon: 11px
    Value: 'text-text-secondary'

  Drag handle: GripVertical 13px, 'opacity-0 group-hover:opacity-30 absolute top-2 right-2'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. src/components/views/ViewFilterBar.tsx
   src/components/views/ViewSortBar.tsx
   src/components/views/ViewFieldsMenu.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Filter/Sort popover contents:
  Popover: bg-bg-2, 320px wide, p-3

  Section title: 'text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mb-2.5'
  "Clear all" link: 'text-[11px] text-text-tertiary hover:text-text-secondary ml-auto cursor-pointer'

  Each filter rule row:
    'flex items-center gap-2 mb-2'
    Field selector (Radix Select):
      trigger: 'h-7 px-2 text-[12px] bg-bg-3 border border-border-default rounded-[4px]
                text-text-secondary hover:bg-bg-4 min-w-[120px] flex items-center gap-1.5'
    Operator selector: same styles, min-w-[110px]
    Value input: h-7 text-[12px] (same Input but shorter)
    Delete (X): ghost 24px, X icon 12px

  "+ Add filter/sort" button:
    'flex items-center gap-1.5 mt-1 text-[12px] text-text-tertiary
     hover:text-text-secondary cursor-pointer'
    Plus icon 12px

  Radix Select content popup:
    bg-bg-2 border border-border-default rounded-[6px] shadow-md
    Item: h-[28px] px-2 text-[12px] text-text-secondary hover:bg-bg-3 rounded-[4px]

  Fields menu popover (ViewFieldsMenu):
    Each field row (h-[28px]):
      'flex items-center gap-2 px-2 rounded-[4px] hover:bg-bg-3 cursor-pointer'
      Checkbox: same Radix checkbox style as table
      Field icon + name: text-[13px] text-text-secondary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. src/components/field/FieldPanel.tsx + FieldTypeGrid.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FieldPanel (right slide-in panel):
  'fixed right-0 top-[44px] bottom-0 z-35
   w-[340px] bg-bg-1 border-l border-border-default
   flex flex-col
   translate-x-full transition-transform duration-[150ms] ease-[ease]'

  Open: 'translate-x-0'
  Backdrop: 'fixed inset-0 bg-black/40 z-30'

  Header:
    'flex items-center justify-between px-4 py-3.5 border-b border-border-subtle'
    Title: 'text-[14px] font-semibold text-text-primary'
    Close: X icon, ghost sm

  Body: 'flex-1 overflow-y-auto px-4 py-4 space-y-5'

  Section within body:
    Label: 'text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mb-2'
    Content below: form controls

  Footer:
    'px-4 py-3.5 border-t border-border-subtle flex items-center justify-end gap-2'

FieldTypeGrid:
  '3-column grid gap-1.5 p-1'
  Each type card:
    'flex flex-col items-start gap-1.5
     p-2.5 rounded-[6px] border border-border-subtle
     cursor-pointer bg-bg-2
     hover:border-border-default hover:bg-bg-3
     transition-all duration-[80ms]'

    Selected: 'border-border-strong bg-bg-3'

    Icon: 14px, 'text-text-secondary'
    Label: 'text-[11px] font-medium text-text-secondary leading-none'
    Description: 'text-[10px] text-text-tertiary leading-tight' (1-2 words max)

SelectOptionsEditor options list:
  Each row: 'flex items-center gap-2 h-[30px]'
  Color swatch: 'w-[14px] h-[14px] rounded-[3px] cursor-pointer shrink-0 border border-black/20'
  Label input: 'flex-1 h-[26px] px-2 text-[12px] bg-transparent border border-transparent
               rounded-[3px] text-text-primary hover:border-border-default
               focus:border-border-strong focus:bg-bg-2 outline-none'
  Delete: X icon 12px, ghost 24px, 'opacity-0 group-hover:opacity-100'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. src/components/row/RowEditorPanel.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Panel container:
  'fixed right-0 top-[44px] bottom-0 z-35
   w-[480px] bg-bg-1 border-l border-border-default
   flex flex-col
   translate-x-full transition-transform duration-[150ms] ease-[ease]'

  Open: 'translate-x-0'
  Backdrop: 'fixed inset-0 bg-black/40 z-30' onClick=closeRow

Header:
  'flex items-center gap-2.5 px-5 h-[44px] border-b border-border-subtle shrink-0'
  Collection emoji + name: 'text-[12px] text-text-tertiary font-medium'
  Spacer: flex-1
  Short row ID: 'font-mono text-[10px] text-text-tertiary px-1.5 py-0.5 bg-bg-2 rounded-[3px]'
  Close: X icon ghost sm

Sub-header (timestamps + save status):
  'flex items-center gap-3 px-5 py-2 border-b border-border-subtle
   text-[11px] text-text-tertiary shrink-0'
  "Created [time]" · "Updated [time]"
  Save status: 'ml-auto' — "Saving..." in text-text-tertiary / "Saved" with Check icon

Body (scrollable):
  'flex-1 overflow-y-auto px-5 py-5 space-y-6'

Each field section:
  Label row:
    'flex items-center gap-1.5 mb-1.5'
    FieldTypeIcon: 12px, 'text-text-tertiary'
    Field name: 'text-[11px] font-semibold uppercase tracking-[0.06em] text-text-tertiary'
    Required asterisk: 'text-c-red ml-0.5'

  Value area: full-width, styled per field type (see below)

Field editors inside row editor:

  text / url / email / phone:
    'w-full px-3 py-2 text-[13px] text-text-primary
     bg-bg-2 border border-border-default rounded-[4px]
     hover:border-border-strong
     focus:outline-none focus:border-border-strong
     placeholder:text-text-placeholder
     transition-colors duration-[80ms]'

  rich_text (Tiptap):
    'min-h-[80px] px-3 py-2 text-[13px] text-text-primary
     bg-bg-2 border border-border-default rounded-[4px]
     focus-within:border-border-strong transition-colors duration-[80ms]'
    Tiptap toolbar: 'flex gap-1 mb-2 pb-2 border-b border-border-subtle'
    Toolbar buttons: ghost 24px, bold/italic/list icons

  number:
    Same as text input but with unit suffix:
    'relative' wrapper, unit as 'absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-text-tertiary'

  boolean:
    'flex items-center gap-2.5'
    Large checkbox 16px + "True"/"False" label text-[13px] text-text-secondary

  select: display all options as clickable pills in a flex-wrap group
    Selected pill: option.color bg, full opacity
    Unselected: 'bg-bg-2 text-text-tertiary border border-border-default'
    All pills: 'px-2.5 py-1 text-[12px] font-medium rounded-[4px] cursor-pointer transition-colors duration-[80ms]'

  multi_select: same as select, multiple can be active, checkmark on selected

  relation: RelationPicker component
    Pills: same as RelationCell pills
    "+ Link" button: ghost sm, 'text-text-tertiary'

  file: drop zone
    'w-full rounded-[6px] border border-dashed border-border-default
     p-5 text-center text-[12px] text-text-tertiary
     hover:border-border-strong hover:bg-bg-2 transition-all duration-[80ms]
     cursor-pointer'
    Upload icon: 20px, text-text-tertiary, mb-2
    Text: "Drop files or click to browse"

Footer:
  'px-5 py-3.5 border-t border-border-subtle shrink-0'
  Delete button: danger sm variant, 'text-[12px]'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. src/components/row/BulkActionBar.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'fixed bottom-4 left-1/2 -translate-x-1/2 z-50
 flex items-center gap-3 px-4 h-[40px]
 bg-bg-2 border border-border-strong
 rounded-[8px] shadow-[0_8px_32px_rgba(0,0,0,0.6)]'

Count: 'text-[12px] font-medium text-text-secondary mr-1'
Separator: 'h-4 w-px bg-border-default'
Action buttons: ghost sm
Delete: danger sm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. src/components/collection/CreateCollectionModal.tsx
    src/components/collection/EditCollectionModal.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Emoji + color picker row:
  'flex items-center gap-3 p-3
   bg-bg-2 rounded-[6px] border border-border-default mb-4'

  Emoji button:
    'w-[40px] h-[40px] text-[20px] flex items-center justify-center
     rounded-[6px] border border-border-default bg-bg-3
     hover:bg-bg-4 cursor-pointer transition-colors duration-[80ms]'

  Color swatches: inline flex-wrap gap-1.5 (the ColorPicker component)
    Each swatch: 'w-5 h-5 rounded-[3px] cursor-pointer'
    Selected: 'ring-2 ring-offset-1 ring-offset-bg-2 ring-border-strong'

Slug preview:
  'text-[11px] text-text-tertiary font-mono mt-1 px-1'
  "kern.app/c/[slug]" with the slug part in text-text-secondary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. src/components/collection/DeleteCollectionDialog.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Warning box above confirmation input:
  'flex items-start gap-3 p-3 mb-4
   bg-[#e05252]/8 border border-[#e05252]/20 rounded-[6px]'
  AlertTriangle icon: 15px text-c-red shrink-0 mt-0.5
  Text: text-[13px] text-text-secondary

Confirmation input (type collection name):
  Same Input styles
  Valid (matches): 'border-c-red/50'

Delete button: only active when name matches
  When inactive: opacity-40 cursor-not-allowed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. src/components/command/CommandPalette.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overlay: 'fixed inset-0 bg-black/50 z-50'

Dialog content:
  'fixed top-[15%] left-1/2 -translate-x-1/2 z-50
   w-full max-w-[580px] mx-4
   bg-bg-2 border border-border-default
   rounded-[10px]
   shadow-[0_16px_48px_rgba(0,0,0,0.7)]
   overflow-hidden'

Input row (the search bar):
  'flex items-center gap-3 px-4 h-[46px]
   border-b border-border-subtle'
  Search icon: 16px, text-text-tertiary
  Input: 'flex-1 bg-transparent text-[14px] text-text-primary
          outline-none placeholder:text-text-placeholder'
  Kbd [Esc]: shown on right

Group heading:
  'px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary'

Command item:
  'flex items-center gap-3 px-4 h-[34px] cursor-pointer
   transition-colors duration-[80ms]
   aria-selected:bg-bg-3'

  Icon: 15px, 'text-text-tertiary aria-selected:text-text-secondary'
  Label: 'text-[13px] text-text-secondary flex-1 aria-selected:text-text-primary'
  Shortcut Kbd: ml-auto

Empty state (Command.Empty):
  'flex items-center justify-center h-[80px]
   text-[13px] text-text-tertiary'

List: 'overflow-y-auto max-h-[380px] pb-1'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13. Live source badge (LiveSourceBadge.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Idle:
  'inline-flex items-center gap-1.5 text-[11px] text-text-tertiary
   px-2 py-0.5 rounded-[3px] bg-bg-2 border border-border-subtle'
  Dot: 4px circle, bg-[#52a869]

Syncing:
  Same but dot has 'animate-pulse bg-[#d4a847]'
  Text: "Syncing..."

Error:
  'border-[#e05252]/30 bg-[#e05252]/8 text-[#e05252]'
  Dot: bg-[#e05252]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14. src/pages/CollectionPage.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The page itself:
  'flex flex-col h-full'
  Header: fixed/sticky at top (CollectionHeader)
  Content area: 'flex-1 overflow-hidden'
    Padding: 0 (the views handle their own padding internally)

Loading state (skeleton):
  Show a skeleton that matches the collection header shape + 8 skeleton rows below

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFY after this prompt:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Table view: columns are dark, cells are clean, hover is subtle
- [ ] Selecting rows: checkbox is correct, bulk bar floats correctly
- [ ] Kanban: columns are dark panels, cards are slightly elevated bg-bg-2
- [ ] Row editor: slides in correctly, fields are well spaced, Instrument Serif labels
- [ ] Command palette: dark overlay, clean input, items selectable by keyboard
- [ ] Create collection modal: emoji picker visible, color swatches visible
- [ ] Field panel: slides in from right, field type grid looks correct
- [ ] Filter bar: popover opens, rule rows are clean
- [ ] No white backgrounds anywhere in the collection surface
```

---

## PROMPT 3 — Dashboard, Settings & Polish
### The last mile: dashboard widgets, settings, toasts, empty states, typography consistency
### Run AFTER Prompt 2 is verified

```
FRONTEND REDESIGN — PROMPT 3 of 3
Reference the design system block above. Apply it to all files listed.

This prompt covers the remaining surfaces: Dashboard, Settings, all toast/notification UI,
and a final consistency pass to ensure Instrument Serif italic is correctly used on all
display text, zero-data states, and page titles.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. src/pages/DashboardPage.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page container:
  'min-h-full bg-bg-0 p-6'

Page header:
  'flex items-center justify-between mb-6'
  Title: use Instrument Serif italic
    'font-["Instrument_Serif"] italic text-[28px] text-text-primary
     tracking-[-0.02em] leading-tight'
    "Dashboard"
  Add widget button: secondary sm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. src/components/dashboard/WidgetWrapper.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Card:
  'bg-bg-1 border border-border-subtle rounded-[8px]
   flex flex-col overflow-hidden
   hover:border-border-default transition-colors duration-[150ms] group'

Header:
  'flex items-center justify-between
   px-4 h-[38px] border-b border-border-subtle shrink-0'
  Title: 'text-[12px] font-semibold uppercase tracking-[0.05em] text-text-tertiary'
  Delete button: 'opacity-0 group-hover:opacity-100 transition-opacity duration-[80ms]'
    X icon 13px, ghost 24px

Content area: 'flex-1 overflow-hidden p-4'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. Widget components — all 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CollectionStatsWidget:
  Large number: 'font-["Instrument_Serif"] italic text-[48px] leading-none
                 text-text-primary tracking-[-0.03em]'
  "rows" label below: 'text-[12px] text-text-tertiary uppercase tracking-[0.06em] mt-1'
  Collection name: 'text-[13px] font-medium text-text-secondary mt-3'
  Sub-stats row: 'flex items-center gap-4 mt-3 pt-3 border-t border-border-subtle'
    Each stat: 'text-[11px] text-text-tertiary'
    Stat value: 'text-[11px] text-text-secondary font-medium'

RecentRowsWidget:
  Each row item:
    'flex items-center gap-2.5 py-2 border-b border-border-subtle last:border-0
     cursor-pointer hover:bg-bg-2 rounded-[4px] px-1 -mx-1
     transition-colors duration-[80ms]'
    Primary value: 'text-[13px] text-text-secondary flex-1 truncate'
    Secondary value: 'text-[11px] text-text-tertiary shrink-0 max-w-[100px] truncate'
    Time: 'text-[10px] text-text-tertiary shrink-0 font-mono'

  "+ Add row" footer:
    'mt-2 pt-2 border-t border-border-subtle
     text-[12px] text-text-tertiary hover:text-text-secondary
     cursor-pointer flex items-center gap-1.5'

LiveSourceStatusWidget:
  Source type icon: 18px
  Status line: Dot (6px, status-colored) + "Last synced [time]" text-[12px] text-text-tertiary
  Error state: red-tinted card bg, error message text-[12px] text-c-red
  "Sync now" button: secondary xs

QuickAddWidget:
  Input + button row: 'flex gap-2'
  Input: flex-1 h-8
  "Add" button: primary sm

ViewEmbedWidget:
  Small info header: collection name + view name in text-[11px] text-text-tertiary
  Content: simplified row list, same styles as RecentRows

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. src/components/dashboard/AddWidgetModal.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Widget type cards (step 1):
  '5-card grid (or 2+3 rows)'
  Each card:
    'flex flex-col gap-2 p-3.5
     bg-bg-2 border border-border-subtle rounded-[6px]
     cursor-pointer hover:border-border-default hover:bg-bg-3
     transition-all duration-[80ms]'
    Selected: 'border-border-strong bg-bg-3'

    Icon: 18px, text-text-secondary
    Name: 'text-[13px] font-medium text-text-primary mt-0.5'
    Description: 'text-[11px] text-text-tertiary leading-snug'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. src/pages/SettingsPage.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page layout:
  'min-h-full bg-bg-0'
  Inner: 'max-w-[680px] mx-auto px-8 py-8'

Page title: Instrument Serif italic
  'font-["Instrument_Serif"] italic text-[28px] text-text-primary
   tracking-[-0.02em] mb-8'
  "Settings"

Tab list:
  'flex gap-0 border-b border-border-subtle mb-8'
  Each tab:
    'px-4 pb-3 text-[13px] font-medium text-text-tertiary
     border-b-[2px] border-b-transparent cursor-pointer
     hover:text-text-secondary transition-colors duration-[80ms]'
    Active: 'text-text-primary border-b-[2px] border-b-accent'

Settings sections within tabs:
  Each section:
    'mb-8 pb-8 border-b border-border-subtle last:border-0 last:pb-0 last:mb-0'
  Section title:
    'text-[13px] font-semibold text-text-primary mb-1'
  Section description:
    'text-[12px] text-text-tertiary mb-4 leading-relaxed'

MCP Integration card:
  'bg-bg-1 border border-border-default rounded-[8px] p-5'
  URL code block:
    'font-mono text-[12px] text-text-secondary bg-bg-2
     border border-border-subtle rounded-[4px] px-3 py-2.5 break-all'
  Copy button: secondary sm, positioned end of the code block row

Danger zone card:
  'bg-bg-1 border border-[#e05252]/20 rounded-[8px] p-5'
  Section title: 'text-[13px] font-semibold text-c-red mb-1'

Profile section:
  Avatar: 'w-[52px] h-[52px] rounded-full bg-bg-3 border border-border-default
           flex items-center justify-center text-[18px] font-semibold text-text-secondary'
  "Change avatar" button: ghost sm positioned below avatar

Keyboard shortcuts modal:
  Two-column grid of shortcuts:
    Action column: 'text-[13px] text-text-secondary'
    Kbd column: 'flex justify-end'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. Sonner toasts (configure in AppShell)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Update the Toaster component configuration:

<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#1a1a1a',
      border: '1px solid #2e2e2e',
      color: '#f0f0f0',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      padding: '10px 14px',
      gap: '10px',
    },
    classNames: {
      toast: 'items-start',
      title: 'text-[13px] font-medium text-text-primary',
      description: 'text-[12px] text-text-tertiary mt-0.5',
      actionButton: 'bg-bg-3 text-text-secondary border border-border-default rounded-[4px] text-[11px] px-2 h-6 hover:bg-bg-4',
      cancelButton: 'text-text-tertiary text-[11px]',
      closeButton: 'bg-bg-2 border border-border-default text-text-tertiary rounded-[4px] hover:bg-bg-3',
    },
  }}
  closeButton
/>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. Calendar and Gallery views
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CalendarView:

  Header: same collection-surface header pattern
    Month title: Instrument Serif italic text-[18px]
    Navigation buttons: ghost sm (← Today →)

  Day labels row:
    'grid grid-cols-7 border-b border-border-subtle bg-bg-1'
    Each: 'py-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary'

  Day cells:
    'min-h-[90px] p-2 border-b border-r border-border-subtle
     bg-bg-0 last:border-r-0'
    Outside month: 'bg-[#080808]'
    Weekend: 'bg-[#0d0d0d]'
    Today cell: no special bg, just the date number gets treatment

    Date number:
      'text-[12px] font-medium text-text-tertiary w-[22px] h-[22px]
       flex items-center justify-center rounded-[4px]'
      Today: 'bg-bg-3 text-text-primary border border-border-strong'

    Event pill:
      'text-[11px] font-medium rounded-[3px] px-1.5 py-0.5 mb-0.5 truncate cursor-pointer
       bg-bg-2 border-l-[2px] border-l-[color] border-t border-r border-b border-border-subtle
       text-text-secondary hover:bg-bg-3 hover:text-text-primary transition-colors duration-[80ms]'

GalleryView:

  Grid: 'p-4 grid gap-3'
    Small: 5 cols, Medium: 4 cols, Large: 3 cols

  Card:
    'bg-bg-1 border border-border-subtle rounded-[8px] overflow-hidden cursor-pointer
     hover:border-border-default transition-colors duration-[80ms] group'

  Cover image area: 'h-[120px] bg-bg-2 overflow-hidden'
    If no image: centered emoji 24px + collection color as bg tint

  Card body: 'p-3'
    Title: 'text-[13px] font-medium text-text-primary leading-snug line-clamp-2'
    Field rows: 'mt-2 space-y-1'
      'flex items-center gap-1.5 text-[11px] text-text-tertiary'

ListView:
  'divide-y divide-border-subtle'
  Each row:
    'flex items-center gap-3 h-[36px] px-4
     hover:bg-bg-2 cursor-pointer transition-colors duration-[80ms] group'
    Primary: 'text-[13px] text-text-primary flex-1 truncate'
    Secondary: 'text-[12px] text-text-tertiary shrink-0 max-w-[200px] truncate'
    Time: 'text-[10px] text-text-tertiary font-mono shrink-0'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. Relation components
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RelationPill:
  'inline-flex items-center gap-1.5
   px-2 py-0.5 text-[11px] text-text-secondary
   bg-bg-2 border border-border-default rounded-[3px]
   hover:bg-bg-3 hover:border-border-strong cursor-pointer
   transition-colors duration-[80ms] max-w-[160px]'
  Text: 'truncate'
  X button on hover: ArrowRight 10px → X 10px on hover

ReferencedBySection:
  Collapsible trigger:
    'flex items-center gap-2 text-[12px] text-text-tertiary
     cursor-pointer hover:text-text-secondary py-2
     transition-colors duration-[80ms]'
    ChevronRight 13px, rotates 90deg when open

  Content: 'mt-2 space-y-3'
    Collection group header:
      'text-[10px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5 flex items-center gap-1.5'
      Collection emoji 12px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. Consistency pass — Instrument Serif italic placement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Apply Instrument Serif italic EXACTLY to these (and only these) elements:
  font-["Instrument_Serif"] italic — these exact classes

  1. "kern" wordmark in Topbar
  2. Modal titles (all modals)
  3. Empty state main messages (the big "No rows yet" type text)
  4. Dashboard page title "Dashboard"
  5. Settings page title "Settings"
  6. CollectionStatsWidget large number (number only, not the label)
  7. Any display headline that is a number or single word at large size (28px+)

  DO NOT apply Instrument Serif to:
  - Navigation items
  - Button labels
  - Table cells
  - Form labels
  - Any text under 18px
  - Collection names in the header (that stays DM Sans semibold)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. Empty state polish pass
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Go through every EmptyState instance in the codebase and ensure:
  - Icon is NOT lucide default color. Use 'text-text-tertiary' always.
  - Title text uses Instrument Serif italic
  - Subtitle is DM Sans text-[13px] text-text-tertiary
  - Action button is secondary sm (never primary for empty states)
  - Container has enough breathing room: py-20 minimum

Specific empty states:
  Empty collection (no rows):
    Icon: Rows (or AlignLeft), 36px
    Title: "Nothing here yet"
    Subtitle: "Add a row to get started, or press ⌘K"

  Empty collection with active filters:
    Icon: FilterX, 36px
    Title: "No results"
    Subtitle: "Try adjusting or clearing your filters"

  Empty sidebar:
    Inline (not centered), 'px-3 py-6 text-center'
    Title: text-[12px] text-text-tertiary (no Instrument Serif here — too prominent)
    "Create your first collection"

  Empty dashboard:
    Icon: LayoutDashboard, 40px
    Title: "Your workspace is empty"
    Subtitle: "Add widgets to build your personal dashboard"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL VERIFICATION — run through the entire app:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- [ ] Dashboard: dark widgets, Instrument Serif page title, stat numbers look editorial
- [ ] Settings: clean sections, tabs work, MCP code block is monospace dark
- [ ] Toasts: dark background, not rounded pills, correct colors
- [ ] Calendar view: dark grid, event pills with left-colored border
- [ ] Gallery view: dark cards, cover images render
- [ ] All empty states: Instrument Serif italic title, correct icon color
- [ ] Consistent border-border-subtle on all dividers
- [ ] No element has a white or light background
- [ ] Zero uses of old kern-* color classes remaining (search and replace any that were missed)
- [ ] All font-family usage is either DM Sans (default), Instrument Serif italic (display), or Geist Mono (code/mono)
- [ ] Scrollbar is dark and thin (5px) everywhere
- [ ] Focus rings are keyboard-only and subtle
- [ ] App feels cohesive — if you open any page, it belongs to the same design language

THE REDESIGN IS COMPLETE.
```