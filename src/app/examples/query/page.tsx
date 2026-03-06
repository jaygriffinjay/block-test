/**
 * /examples/query
 *
 * Demonstrates querying the block database directly:
 *  - All h1 headings across all pages
 *  - All links
 *  - Block count by type
 *  - Full-text search
 *
 * Every query result is rendered using the same BlockRenderer pipeline.
 */

import {
  getBlocksWithChildren,
  getBlocksByType,
  getBlockTypeCounts,
  searchBlocks,
} from "@/lib/blocks/db";
import { seedWorkspace } from "@/lib/blocks/seed";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { Link } from "@/components/typography";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";

export default function QueryExamplePage() {
  // Ensure data exists
  seedWorkspace();

  // ── Queries ─────────────────────────────────────────────────────
  const allH1s = getBlocksWithChildren("h1");
  const allLinks = getBlocksByType("link");
  const typeCounts = getBlockTypeCounts();
  const sqliteHits = searchBlocks("SQLite");
  const blockHits = searchBlocks("block");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Nav */}
      <div className="mb-10 flex items-center justify-between">
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Examples
        </Link>
        <ModeToggle />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Block Queries</h1>
      <p className="text-muted-foreground mb-8">
        Every query hits SQLite directly. Results are rendered through the same
        BlockRenderer pipeline.
      </p>

      {/* ── All H1s ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-1 text-lg font-semibold">All h1 headings</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            SELECT * FROM blocks WHERE type = &apos;h1&apos;
          </code>{" "}
          → {allH1s.length} results
        </p>
        <div className="space-y-2 rounded-lg border p-4">
          {allH1s.map((node) => (
            <BlockRenderer key={node.id} node={node} />
          ))}
          {allH1s.length === 0 && (
            <p className="text-muted-foreground text-sm italic">
              No h1 blocks found
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* ── All Links ────────────────────────────────────────────── */}
      <section className="my-12">
        <h2 className="mb-1 text-lg font-semibold">All links</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            SELECT * FROM blocks WHERE type = &apos;link&apos;
          </code>{" "}
          → {allLinks.length} results
        </p>
        <div className="space-y-2 rounded-lg border p-4">
          {allLinks.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {allLinks.map((block) => (
                <li key={block.id}>
                  <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                    {(block.props as { href?: string }).href ?? "?"}
                  </code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              No link blocks found
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* ── Type Distribution ────────────────────────────────────── */}
      <section className="my-12">
        <h2 className="mb-1 text-lg font-semibold">Block type distribution</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            SELECT type, COUNT(*) FROM blocks GROUP BY type ORDER BY count DESC
          </code>
        </p>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Count</th>
                <th className="w-1/2 px-4 py-2 text-left font-medium">Bar</th>
              </tr>
            </thead>
            <tbody>
              {typeCounts.map(({ type, count }) => {
                const max = typeCounts[0]?.count ?? 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <tr key={type} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{type}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {count}
                    </td>
                    <td className="px-4 py-2">
                      <div
                        className="bg-primary/20 h-4 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Separator />

      {/* ── Full-text search: "SQLite" ───────────────────────────── */}
      <section className="my-12">
        <h2 className="mb-1 text-lg font-semibold">
          Search: &quot;SQLite&quot;
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            SELECT * FROM blocks WHERE type = &apos;text&apos; AND
            json_extract(props, &apos;$.text&apos;) LIKE &apos;%SQLite%&apos;
          </code>{" "}
          → {sqliteHits.length} results
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          {sqliteHits.map((block) => {
            const text = (block.props as { text?: string }).text ?? "";
            return (
              <div key={block.id} className="text-sm">
                <p className="leading-relaxed">
                  {highlightMatch(text, "SQLite")}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  block: {block.id.slice(0, 8)}… · parent:{" "}
                  {block.parent_id?.slice(0, 8) ?? "root"}…
                </p>
              </div>
            );
          })}
          {sqliteHits.length === 0 && (
            <p className="text-muted-foreground text-sm italic">No matches</p>
          )}
        </div>
      </section>

      <Separator />

      {/* ── Full-text search: "block" ────────────────────────────── */}
      <section className="my-12">
        <h2 className="mb-1 text-lg font-semibold">
          Search: &quot;block&quot;
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            ...LIKE &apos;%block%&apos;
          </code>{" "}
          → {blockHits.length} results
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          {blockHits.map((block) => {
            const text = (block.props as { text?: string }).text ?? "";
            return (
              <div key={block.id} className="text-sm">
                <p className="leading-relaxed">
                  {highlightMatch(text, "block")}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  block: {block.id.slice(0, 8)}… · parent:{" "}
                  {block.parent_id?.slice(0, 8) ?? "root"}…
                </p>
              </div>
            );
          })}
          {blockHits.length === 0 && (
            <p className="text-muted-foreground text-sm italic">No matches</p>
          )}
        </div>
      </section>
    </div>
  );
}

/** Highlight matched text in a string */
function highlightMatch(text: string, query: string) {
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
