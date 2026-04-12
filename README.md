# Kern

A personal data OS you build yourself.

Kern is a keyboard-driven, code-extensible system where you define your own data, your own structure, and your own interface — all in one place.

---

## Core Idea

Most tools force your life into their structure.

Kern does the opposite.

You define:
- what you track  
- how it’s structured  
- how it connects  
- how it looks  

Kern provides the engine — you build the system.

---

## What Kern Actually Is

Kern is built on three core primitives:

### 1. Collections
User-defined structured data.

Examples:
- Tasks
- Books
- Workouts
- Projects
- Expenses

Each collection has:
- custom fields (text, number, date, select, relation, etc.)
- no predefined schema
- full flexibility

---

### 2. Views
Ways to visualize your data.

Built-in:
- Table
- Kanban
- Calendar
- Gallery

Custom:
- Write your own views in React (JSX)
- Plug them directly into your workspace
- Unlimited UI possibilities

---

### 3. Live Sources
External data becomes first-class inside Kern.

Examples:
- GitHub (PRs, issues)
- Google Calendar
- Notion
- Linear
- RSS / APIs

Data flows in automatically and behaves exactly like your own.

---

## Command-First Interface

Everything is controlled via keyboard.

Cmd + K opens the command palette.

You can:
- create collections
- add fields
- connect integrations
- filter data
- switch views
- navigate anywhere

Mouse is optional.

---

## MCP Integration (Claude)

Kern exposes an MCP server.

This allows AI tools to:
- read your workspace
- write data into collections
- automate actions

Example:
- Add a book to my reading list
- Show open GitHub PRs linked to Kern
- Create a new collection for interview prep

Kern becomes your personal database.
AI becomes the interface.

---

## Tech Stack

- Frontend: React (Vite)
- Backend: Supabase
  - Auth
  - PostgreSQL (JSONB-based dynamic schema)
  - Realtime
  - Edge Functions (for integrations)
- Editor: Monaco
- UI: Tailwind + Radix

---

## Philosophy

- No predefined modules
- No rigid structure
- No lock-in
- No subscriptions

You are not using an app.

You are building your own system.

---

## How It Works

1. Create a collection: Books  
2. Add fields:
   - Title (text)
   - Status (select)
   - Rating (number)  
3. Add data  
4. View as:
   - Table
   - Kanban  
5. Create relation:
   - Books ↔ Goals  
6. Build a custom view in React  

Everything connects.

---

## Integrations

Kern can connect to:

- GitHub
- Google Calendar
- Notion
- Linear
- RSS / APIs

Each integration becomes a collection.

---

## Cost

- Supabase free tier
- Vercel free tier
- No paid APIs required
- No subscriptions

---

## Status

In development.

Core:
- Collections
- Views
- Command system

Planned:
- Live integrations
- MCP server
- Custom view editor
- Realtime sync

---

## Why Kern Exists

Because your life shouldn’t be split across multiple apps.

Because tools shouldn’t limit how you think.

Because power users need real control.

---

## Summary

Kern is a personal OS where your data is the codebase and your interface is programmable.
