# Block-Based Blog

A Notion-style block data model for a personal blog, backed by SQLite. Every piece of content — headings, paragraphs, comments, entire pages — is a row in one table. One recursive query fetches a page tree, one React component renders it.

## The Idea

A React page isn't source code — it's rows in a table. AI writes blocks, one query fetches the tree, BlockRenderer turns it into React components. That's the entire pipeline.

```
markdown → mdast → blocks → SQLite → recursive CTE → tree → React
```

## Stack

- **Next.js 16** / React 19 / TypeScript / App Router
- **SQLite** (better-sqlite3, WAL mode) — one table, one schema
- **Tailwind CSS v4** + **shadcn/ui** (new-york)
- **Custom typography system** — `H1`–`H6`, `Paragraph`, `Bold`, `Italic`, etc.
- **mdast-util-from-markdown** — markdown to blocks ingestion
- **nanoid** — short readable block IDs

## Block Schema

```sql
CREATE TABLE blocks (
  id         TEXT PRIMARY KEY,   -- nanoid
  type       TEXT NOT NULL,      -- page, h1, paragraph, comment, etc.
  props      TEXT DEFAULT '{}',  -- JSON: { title, text, href, approved, ... }
  content    TEXT DEFAULT '[]',  -- JSON: ordered array of child block IDs
  parent_id  TEXT,               -- upward pointer (null for root pages)
  position   INTEGER DEFAULT 0,  -- sibling sort order
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Block types:** `page`, `h1`–`h6`, `paragraph`, `blockquote`, `list`, `list_item`, `divider`, `text`, `bold`, `italic`, `underline`, `strikethrough`, `highlight`, `inline_code`, `small`, `link`, `comment`

## Features

### Block System

- Recursive CTE queries for tree fetching, ancestry chains, full-text search
- `BlockRenderer` maps every block type to a React component
- `BlockTheme` context for per-block-type className overrides
- MD → blocks ingestion pipeline

### Page Editor

- Infinite nested pages with collapsible sidebar nav
- Breadcrumb ancestry trail
- Inline contentEditable editing with debounced PATCH
- Hover toolbar: add block below, delete, drag (placeholder)
- Editable page titles with emoji icon picker

### Comment System

- Comments are blocks — same DB, same queries, same delete
- Anonymous posting with rate limiting + input validation
- Approval queue: comments start pending (`approved: false`), admin approves
- No accounts, no OAuth, no third-party dependencies

### Security

- `ADMIN_TOKEN` env var gates all write operations
- Block API (POST/PATCH/DELETE) requires admin auth
- Comment posting is public; moderation is admin-only
- Rate limiting on comment submissions (1 per 10s per IP)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is created and seeded automatically on first page load.

### Admin Setup

```bash
# Generate a token
openssl rand -base64 32

# Add to .env.local (gitignored)
echo "ADMIN_TOKEN=<your-token>" > .env.local
```

Set the same token in the admin UI at `/admin/comments` (saved to localStorage).

## Project Structure

```
src/
  lib/
    blocks/
      types.ts          # BlockType, Block, BlockNode, helpers
      db.ts             # All SQLite operations (read, write, query, comments)
      md.ts             # Markdown → blocks converter
      seed.ts           # Auto-seed workspace from content/*.md
    auth.ts             # Admin token verification
    admin-fetch.ts      # Client-side fetch wrapper with auth headers
  components/
    blocks/
      BlockRenderer.tsx  # Maps block types → React components
      BlockTheme.tsx     # Per-block-type className overrides
      EditableBlock.tsx  # Inline editing + hover toolbar
      PageShell.tsx      # Page editor wrapper (sidebar, breadcrumbs, content)
      PageSidebar.tsx    # Recursive collapsible page tree nav
      Breadcrumbs.tsx    # Ancestor chain display
      CommentForm.tsx    # Anonymous comment submission form
      CommentList.tsx    # Comment display with relative timestamps
      CommentSection.tsx # Drop-in form + list wrapper
    typography/          # H1–H6, Paragraph, Bold, Italic, Link, etc.
    ui/                  # shadcn components
  app/
    api/
      blocks/            # GET (public) / POST, PATCH, DELETE (admin)
      comments/          # GET, POST (public) / PATCH, DELETE (admin)
      test/              # Debugger dispatch endpoint
    pages/               # Nested page editor
    admin/comments/      # Moderation queue (with kitten explosion)
    examples/            # Demo pages
content/                 # Seed markdown files
scripts/                 # CLI tools (seed.ts, import.ts)
data/                    # SQLite database (gitignore the -shm/-wal files)
```

## API

| Method | Endpoint                     | Auth   | Description                   |
| ------ | ---------------------------- | ------ | ----------------------------- |
| GET    | `/api/blocks`                | Public | List root pages               |
| GET    | `/api/blocks?tree=<id>`      | Public | Full block subtree            |
| GET    | `/api/blocks/[id]`           | Public | Single block tree             |
| POST   | `/api/blocks`                | Admin  | Create block                  |
| PATCH  | `/api/blocks/[id]`           | Admin  | Update block                  |
| DELETE | `/api/blocks/[id]`           | Admin  | Delete block + descendants    |
| GET    | `/api/comments?page=<id>`    | Public | Approved comments             |
| GET    | `/api/comments?pending=true` | Admin  | All pending comments          |
| POST   | `/api/comments`              | Public | Submit comment (rate-limited) |
| PATCH  | `/api/comments/[id]`         | Admin  | Approve comment               |
| DELETE | `/api/comments/[id]`         | Admin  | Delete comment                |

## Pages

| Route                | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `/examples`          | Index of all demo pages                                   |
| `/examples/blocks`   | Block renderer demo with themed variants                  |
| `/examples/query`    | Query the block DB — headings, links, search, type counts |
| `/examples/comments` | Live comment form + list                                  |
| `/examples/test`     | Interactive debugger for every DB operation               |
| `/pages`             | Nested page editor                                        |
| `/admin/comments`    | Comment moderation queue                                  |

## Scripts

```bash
npm run dev      # dev server (seeds DB on first load)
npm run build    # production build
npx tsx scripts/seed.ts      # manually seed the database
npx tsx scripts/import.ts    # import a markdown file
```
