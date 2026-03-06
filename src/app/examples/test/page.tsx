"use client";

/**
 * /examples/test — Block System Debugger
 *
 * Interactive test page that exercises every DB operation with visible
 * inputs, outputs, and before/after state. A tool for understanding
 * and battle-testing the block system.
 *
 * Sections:
 *   1. MD → Blocks pipeline (paste markdown, see blocks + rendered output)
 *   2. CRUD operations (insert, read, update, delete with live state)
 *   3. Tree operations (getBlockTree, buildTree, getAncestors)
 *   4. Query helpers (search, by-type, type counts)
 */

import React, { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import Link from "next/link";

// ─── API helper ───────────────────────────────────────────────────────────────

async function api(action: string, body: Record<string, unknown> = {}) {
  const res = await fetch("/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Examples
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        🔬 Block System Debugger
      </h1>
      <p className="text-muted-foreground mb-10">
        Interactive test harness for every block operation. See inputs, outputs,
        and DB state at each step.
      </p>

      <div className="space-y-16">
        <MdPipelineSection />
        <hr className="border-border" />
        <CrudSection />
        <hr className="border-border" />
        <TreeSection />
        <hr className="border-border" />
        <QuerySection />
      </div>
    </div>
  );
}

// ─── Section 1: MD → Blocks Pipeline ──────────────────────────────────────────

const SAMPLE_MD = `# Hello World

This is a **bold** statement with some *italic* text.

## Features

- Block-based data model
- Recursive tree queries
- Markdown ingestion

> Everything is a block.

Visit [the docs](https://example.com) for more.`;

function MdPipelineSection() {
  const [markdown, setMarkdown] = useState(SAMPLE_MD);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    const data = await api("md-to-blocks", {
      markdown,
      title: "Test Page",
      icon: "🧪",
    });
    setResult(data);
    setLoading(false);
  }, [markdown]);

  return (
    <section>
      <SectionHeader
        title="1. Markdown → Blocks Pipeline"
        description="Paste markdown, see the parsed blocks. Verifies mdToBlocks() output without touching the DB."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div>
          <Label>Markdown Input</Label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={14}
            className="w-full rounded-lg border bg-muted/30 p-3 font-mono text-xs resize-y"
          />
          <RunButton onClick={run} loading={loading}>
            Parse → Blocks
          </RunButton>
        </div>

        {/* Output */}
        <div>
          <Label>
            Output Blocks{" "}
            {result && (
              <span className="text-muted-foreground font-normal">
                ({(result.count as number) ?? 0} blocks)
              </span>
            )}
          </Label>
          <JsonOutput data={result} />
        </div>
      </div>
    </section>
  );
}

// ─── Section 2: CRUD Operations ───────────────────────────────────────────────

function CrudSection() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [testBlockId] = useState(() => `test_${nanoid(8)}`);
  const [parentBlockId] = useState(() => `parent_${nanoid(8)}`);

  const addLog = useCallback(
    (op: string, data: Record<string, unknown>) => {
      setLog((prev) => [{ op, data, ts: Date.now() }, ...prev]);
    },
    [],
  );

  const runInsertParent = useCallback(async () => {
    const data = await api("insert", {
      block: {
        id: parentBlockId,
        type: "paragraph",
        props: { className: "test-parent" },
        content: [],
        parent_id: null,
        position: 0,
      },
    });
    addLog("INSERT parent", data);
  }, [parentBlockId, addLog]);

  const runInsert = useCallback(async () => {
    const data = await api("insert", {
      block: {
        id: testBlockId,
        type: "h1",
        props: {},
        content: [],
        parent_id: null,
        position: 0,
      },
    });
    addLog("INSERT", data);
  }, [testBlockId, addLog]);

  const runRead = useCallback(async () => {
    const data = await api("read", { id: testBlockId });
    addLog("READ", data);
  }, [testBlockId, addLog]);

  const runUpdate = useCallback(async () => {
    const data = await api("update", {
      id: testBlockId,
      patch: {
        props: { text: "Updated at " + new Date().toLocaleTimeString() },
        type: "paragraph",
      },
    });
    addLog("UPDATE", data);
  }, [testBlockId, addLog]);

  const runMove = useCallback(async () => {
    const data = await api("move", {
      id: testBlockId,
      newParentId: parentBlockId,
      newPosition: 0,
    });
    addLog("MOVE", data);
  }, [testBlockId, parentBlockId, addLog]);

  const runDelete = useCallback(async () => {
    const data = await api("delete", { id: testBlockId });
    addLog("DELETE", data);
  }, [testBlockId, addLog]);

  const runCleanup = useCallback(async () => {
    const d1 = await api("delete", { id: testBlockId });
    const d2 = await api("delete", { id: parentBlockId });
    addLog("CLEANUP", { block1: d1, block2: d2 });
  }, [testBlockId, parentBlockId, addLog]);

  return (
    <section>
      <SectionHeader
        title="2. CRUD Operations"
        description={`Tests insert, read, update, move, and delete on live blocks. Test block: ${testBlockId}`}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <RunButton onClick={runInsert}>① Insert Block</RunButton>
        <RunButton onClick={runInsertParent}>② Insert Parent</RunButton>
        <RunButton onClick={runRead}>③ Read</RunButton>
        <RunButton onClick={runUpdate}>④ Update (→ paragraph)</RunButton>
        <RunButton onClick={runMove}>⑤ Move → Parent</RunButton>
        <RunButton onClick={runDelete}>⑥ Delete Block</RunButton>
        <RunButton onClick={runCleanup} variant="destructive">
          🗑 Cleanup Both
        </RunButton>
      </div>

      <Label>
        Operation Log{" "}
        <span className="text-muted-foreground font-normal">
          (newest first)
        </span>
      </Label>
      <div className="max-h-[500px] overflow-auto rounded-lg border bg-muted/30 p-3 space-y-3">
        {log.length === 0 && (
          <p className="text-muted-foreground text-sm italic">
            Run an operation to see results here.
          </p>
        )}
        {log.map((entry, i) => (
          <div key={i} className="rounded border bg-background p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                {entry.op}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
            </div>
            <pre className="text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-[200px]">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section 3: Tree Operations ───────────────────────────────────────────────

function TreeSection() {
  const [blockId, setBlockId] = useState("ws_root");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [ancestorId, setAncestorId] = useState("");
  const [ancestorResult, setAncestorResult] = useState<Record<string, unknown> | null>(null);

  const runTree = useCallback(async () => {
    const data = await api("tree", { id: blockId });
    setResult(data);
  }, [blockId]);

  const runAncestors = useCallback(async () => {
    if (!ancestorId) return;
    const data = await api("ancestors", { id: ancestorId });
    setAncestorResult(data);
  }, [ancestorId]);

  return (
    <section>
      <SectionHeader
        title="3. Tree Operations"
        description="Fetch block trees and ancestor chains. Enter any block ID to explore."
      />

      {/* getBlockTree */}
      <div className="mb-8">
        <Label>getBlockTree(id) → flat + tree</Label>
        <div className="flex gap-2 mb-3">
          <input
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            placeholder="Block ID (e.g. ws_root)"
            className="flex-1 rounded border bg-muted/30 px-3 py-1.5 font-mono text-xs"
          />
          <RunButton onClick={runTree}>Fetch Tree</RunButton>
        </div>
        {result && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label>
                Flat blocks{" "}
                <span className="text-muted-foreground font-normal">
                  ({(result.count as number) ?? 0})
                </span>
              </Label>
              <JsonOutput data={result.flat} maxHeight={400} />
            </div>
            <div>
              <Label>Tree (nested)</Label>
              <JsonOutput data={result.tree} maxHeight={400} />
            </div>
          </div>
        )}
      </div>

      {/* getAncestors */}
      <div>
        <Label>getAncestors(id) → root-first chain</Label>
        <div className="flex gap-2 mb-3">
          <input
            value={ancestorId}
            onChange={(e) => setAncestorId(e.target.value)}
            placeholder="Block ID (paste a deep block ID)"
            className="flex-1 rounded border bg-muted/30 px-3 py-1.5 font-mono text-xs"
          />
          <RunButton onClick={runAncestors}>Get Ancestors</RunButton>
        </div>
        {ancestorResult && (
          <>
            <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
              {((ancestorResult.ancestors as Array<{ id: string; type: string; props: Record<string, unknown> }>) ?? []).map(
                (a, i) => (
                  <React.Fragment key={a.id}>
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                      {(a.props?.icon as string) || ""}{" "}
                      {(a.props?.title as string) || a.type}
                    </span>
                  </React.Fragment>
                ),
              )}
            </div>
            <JsonOutput data={ancestorResult} maxHeight={200} />
          </>
        )}
      </div>
    </section>
  );
}

// ─── Section 4: Query Helpers ─────────────────────────────────────────────────

function QuerySection() {
  const [searchQuery, setSearchQuery] = useState("block");
  const [searchResult, setSearchResult] = useState<Record<string, unknown> | null>(null);

  const [typeQuery, setTypeQuery] = useState("h1");
  const [typeResult, setTypeResult] = useState<Record<string, unknown> | null>(null);

  const [countsResult, setCountsResult] = useState<Record<string, unknown> | null>(null);

  const runSearch = useCallback(async () => {
    const data = await api("search", { query: searchQuery });
    setSearchResult(data);
  }, [searchQuery]);

  const runByType = useCallback(async () => {
    const data = await api("by-type", { type: typeQuery });
    setTypeResult(data);
  }, [typeQuery]);

  const runCounts = useCallback(async () => {
    const data = await api("type-counts");
    setCountsResult(data);
  }, []);

  return (
    <section>
      <SectionHeader
        title="4. Query Helpers"
        description="Full-text search, type filters, and distribution stats."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Search */}
        <div>
          <Label>searchBlocks(query)</Label>
          <div className="flex gap-2 mb-3">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search text..."
              className="flex-1 rounded border bg-muted/30 px-3 py-1.5 text-xs"
            />
            <RunButton onClick={runSearch}>Search</RunButton>
          </div>
          {searchResult && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {(searchResult.count as number) ?? 0} hits
              </p>
              <div className="space-y-1 max-h-[300px] overflow-auto">
                {((searchResult.results as Array<{ id: string; props: Record<string, unknown>; parent_id: string | null }>) ?? []).map(
                  (block) => (
                    <div
                      key={block.id}
                      className="text-xs bg-muted/50 rounded p-2"
                    >
                      <p>{(block.props?.text as string) ?? ""}</p>
                      <p className="text-muted-foreground mt-0.5">
                        id: {block.id} · parent: {block.parent_id ?? "null"}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>

        {/* By Type */}
        <div>
          <Label>getBlocksByType(type)</Label>
          <div className="flex gap-2 mb-3">
            <select
              value={typeQuery}
              onChange={(e) => setTypeQuery(e.target.value)}
              className="flex-1 rounded border bg-muted/30 px-3 py-1.5 text-xs"
            >
              {[
                "page",
                "h1",
                "h2",
                "h3",
                "paragraph",
                "text",
                "bold",
                "italic",
                "link",
                "list",
                "list_item",
                "blockquote",
                "divider",
                "inline_code",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <RunButton onClick={runByType}>Fetch</RunButton>
          </div>
          {typeResult && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {(typeResult.count as number) ?? 0} blocks of type &ldquo;{typeQuery}&rdquo;
              </p>
              <JsonOutput data={typeResult.results} maxHeight={300} />
            </>
          )}
        </div>

        {/* Type Counts */}
        <div className="lg:col-span-2">
          <Label>getBlockTypeCounts() — distribution</Label>
          <RunButton onClick={runCounts} className="mb-3">
            Load Counts
          </RunButton>
          {countsResult && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-right px-4 py-2 font-medium">Count</th>
                    <th className="text-left px-4 py-2 font-medium w-1/2">
                      Bar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    (countsResult.counts as Array<{
                      type: string;
                      count: number;
                    }>) ?? []
                  ).map(({ type, count }) => {
                    const max =
                      (
                        countsResult.counts as Array<{
                          type: string;
                          count: number;
                        }>
                      )?.[0]?.count ?? 1;
                    const pct = Math.round((count / max) * 100);
                    return (
                      <tr key={type} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono text-xs">{type}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {count}
                        </td>
                        <td className="px-4 py-2">
                          <div
                            className="bg-primary/20 rounded h-4"
                            style={{ width: `${pct}%` }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

interface LogEntry {
  op: string;
  data: Record<string, unknown>;
  ts: number;
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-2">
      {children}
    </p>
  );
}

function RunButton({
  onClick,
  loading,
  children,
  variant,
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "destructive";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        variant === "destructive"
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      } disabled:opacity-50 ${className ?? ""}`}
    >
      {loading ? "Running…" : children}
    </button>
  );
}

function JsonOutput({
  data,
  maxHeight = 500,
}: {
  data: unknown;
  maxHeight?: number;
}) {
  if (!data) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground italic">
        No data yet. Run the operation.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-muted/30 p-3 overflow-auto"
      style={{ maxHeight }}
    >
      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
