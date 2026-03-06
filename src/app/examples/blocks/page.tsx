/**
 * /examples/blocks
 *
 * A server component that:
 *  1. Seeds the workspace from markdown files on first visit (idempotent)
 *  2. Queries all blocks for the workspace via recursive CTE
 *  3. Builds a tree in-memory
 *  4. Renders the tree using BlockRenderer
 *  5. Shows the raw flat JSON underneath so the data model is transparent
 */

import { getBlockTree } from "@/lib/blocks/db";
import { buildTree } from "@/lib/blocks/types";
import { seedWorkspace, WORKSPACE_ID } from "@/lib/blocks/seed";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { BlockTheme } from "@/components/blocks/BlockTheme";
import { Link } from "@/components/typography";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";

export default function BlocksExamplePage() {
  // ── Seed on first visit (reads content/*.md → SQLite) ─────────────
  seedWorkspace();

  // ── Query ─────────────────────────────────────────────────────────
  const flatBlocks = getBlockTree(WORKSPACE_ID);
  const [pageRoot] = buildTree(flatBlocks);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Nav */}
      <div className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Home
        </Link>
        <ModeToggle />
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Left: rendered output */}
        <section>
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-widest uppercase">
            Rendered
          </p>
          <div className="rounded-lg border p-6">
            <BlockRenderer node={pageRoot} />
          </div>

          {/* Block count badge */}
          <p className="text-muted-foreground mt-3 text-xs">
            {flatBlocks.length} blocks · 1 SQLite query (recursive CTE)
          </p>
        </section>

        {/* Right: raw JSON */}
        <section>
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-widest uppercase">
            Raw blocks (flat)
          </p>
          <div className="bg-muted max-h-[720px] overflow-auto rounded-lg border p-4">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(
                flatBlocks.map(
                  ({ id, type, props, content, parent_id, position }) => ({
                    id,
                    type,
                    ...(Object.keys(props as object).length ? { props } : {}),
                    ...(content.length ? { content } : {}),
                    parent_id,
                    position,
                  }),
                ),
                null,
                2,
              )}
            </pre>
          </div>
        </section>
      </div>

      <Separator className="my-12" />

      {/* Explainer */}
      <section className="prose prose-sm dark:prose-invert max-w-none">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="text-muted-foreground mt-3 list-decimal space-y-2 pl-4 text-sm">
          <li>
            Every React component maps to a <code>type</code> string stored in
            SQLite: <code>"h1"</code>, <code>"paragraph"</code>,{" "}
            <code>"bold"</code>, etc.
          </li>
          <li>
            Component <strong>props</strong> are arbitrary JSON — the renderer
            spreads them back onto the component.
          </li>
          <li>
            Child relationships are stored as an ordered array of IDs in{" "}
            <code>content</code> (downward pointers) plus a{" "}
            <code>parent_id</code> (upward pointer — mirrors Notion exactly).
          </li>
          <li>
            A single <strong>recursive CTE</strong> fetches all descendants of
            the page block in one query. The flat list is assembled into a tree
            in memory, then rendered recursively by <code>BlockRenderer</code>.
          </li>
          <li>
            Adding new block types = adding a case to the <code>switch</code> in{" "}
            <code>BlockRenderer.tsx</code>. The data schema never changes.
          </li>
        </ol>
      </section>

      <Separator className="my-12" />

      {/* Themed re-render demo */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Custom theme wrapper</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Same block tree, different styles. Wrap with{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {"<BlockTheme overrides={{ h1: '…', paragraph: '…' }}>"}
          </code>{" "}
          and every block picks up the extra classes via context.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Theme A: compact / muted */}
          <div className="rounded-lg border p-6">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase">
              Compact theme
            </p>
            <BlockTheme
              overrides={{
                h1: "text-2xl text-muted-foreground",
                h2: "text-lg text-muted-foreground",
                paragraph: "text-sm leading-snug text-muted-foreground",
                bold: "text-foreground",
                list: "text-sm text-muted-foreground",
              }}
            >
              <BlockRenderer node={pageRoot} />
            </BlockTheme>
          </div>

          {/* Theme B: colorful / large */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30">
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase">
              Colorful theme
            </p>
            <BlockTheme
              overrides={{
                h1: "text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent",
                h2: "text-2xl text-blue-600 dark:text-blue-400",
                paragraph: "text-base leading-relaxed",
                bold: "text-purple-600 dark:text-purple-400",
                link: "text-blue-500 underline decoration-2 underline-offset-2",
                list: "marker:text-purple-500",
                blockquote:
                  "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20",
              }}
            >
              <BlockRenderer node={pageRoot} />
            </BlockTheme>
          </div>
        </div>
      </section>

      <Separator className="my-12" />

      {/* API links */}
      <section>
        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase">
          REST API
        </p>
        <div className="space-y-1 text-sm">
          <p>
            <code className="text-xs">GET /api/blocks</code> — list all page
            blocks
          </p>
          <p>
            <code className="text-xs">GET /api/blocks/{"{id}"}</code> — full
            subtree for a page as flat JSON
          </p>
          <p>
            <code className="text-xs">POST /api/blocks</code> — replace a page's
            block tree: <code>{`{ pageId, blocks[] }`}</code>
          </p>
        </div>
      </section>
    </div>
  );
}
