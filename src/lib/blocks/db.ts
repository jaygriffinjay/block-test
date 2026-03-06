/**
 * SQLite database module (server-only)
 *
 * The whole point: a React page isn't source code — it's rows in a table.
 * AI writes blocks, one query fetches the tree, BlockRenderer turns it into
 * React components. That's the entire pipeline.
 *
 * Intentionally minimal. Pages are replaced wholesale via replacePageBlocks().
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Block, BlockRow, BlockNode } from "./types";
import { rowToBlock, buildTree } from "./types";

// ─── Connection ───────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "blocks.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id         TEXT    PRIMARY KEY,
      type       TEXT    NOT NULL,
      props      TEXT    NOT NULL DEFAULT '{}',
      content    TEXT    NOT NULL DEFAULT '[]',
      parent_id  TEXT,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_id);
  `);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all blocks in a page's subtree with a single recursive CTE query.
 * Returns a flat list — call buildTree() to assemble into a render tree.
 */
export function getBlockTree(rootId: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    WITH RECURSIVE tree AS (
      SELECT * FROM blocks WHERE id = ?
      UNION ALL
      SELECT b.* FROM blocks b
      INNER JOIN tree t ON b.parent_id = t.id
    )
    SELECT * FROM tree
  `,
    )
    .all(rootId) as BlockRow[];
  return rows.map(rowToBlock);
}

/** List all top-level page blocks. */
export function listPages(): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'page' AND parent_id IS NULL ORDER BY position",
    )
    .all() as BlockRow[];
  return rows.map(rowToBlock);
}

export function hasBlock(id: string): boolean {
  const db = getDb();
  return !!db.prepare("SELECT 1 FROM blocks WHERE id = ? LIMIT 1").get(id);
}

/** Get a single block by ID. */
export function getBlock(id: string): Block | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM blocks WHERE id = ?")
    .get(id) as BlockRow | undefined;
  return row ? rowToBlock(row) : null;
}

/** List child pages of a given parent (direct children only, type='page'). */
export function listChildPages(parentId: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'page' AND parent_id = ? ORDER BY position",
    )
    .all(parentId) as BlockRow[];
  return rows.map(rowToBlock);
}

/**
 * Build a nested page tree starting from a root.
 * Only fetches page-type blocks — not content blocks.
 * Used for the sidebar nav.
 */
export interface PageTreeNode {
  id: string;
  props: Record<string, unknown>;
  children: PageTreeNode[];
}

export function getPageTree(rootId: string): PageTreeNode[] {
  const root = getBlock(rootId);
  if (!root || root.type !== "page") return [];

  function buildChildren(parentId: string): PageTreeNode[] {
    const children = listChildPages(parentId);
    return children.map((child) => ({
      id: child.id,
      props: child.props,
      children: buildChildren(child.id),
    }));
  }

  return buildChildren(rootId);
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Replace all blocks for a page in one transaction.
 * This is the primary write path — AI generates a full block tree and we
 * swap the old page out atomically.
 */
export function replacePageBlocks(
  pageId: string,
  blocks: Omit<Block, "created_at" | "updated_at">[],
): void {
  const db = getDb();
  const now = Date.now();

  const deleteTree = db.prepare(`
    WITH RECURSIVE to_delete AS (
      SELECT id FROM blocks WHERE id = ?
      UNION ALL
      SELECT b.id FROM blocks b
      INNER JOIN to_delete t ON b.parent_id = t.id
    )
    DELETE FROM blocks WHERE id IN (SELECT id FROM to_delete)
  `);

  const insert = db.prepare(`
    INSERT INTO blocks (id, type, props, content, parent_id, position, created_at, updated_at)
    VALUES (@id, @type, @props, @content, @parent_id, @position, @created_at, @updated_at)
  `);

  db.transaction(() => {
    deleteTree.run(pageId);
    for (const block of blocks) {
      insert.run({
        id: block.id,
        type: block.type as string,
        props: JSON.stringify(block.props),
        content: JSON.stringify(block.content),
        parent_id: block.parent_id,
        position: block.position,
        created_at: now,
        updated_at: now,
      });
    }
  })();
}

/**
 * Seed a page once — no-op if it already exists.
 */
export function seedOnce(
  pageId: string,
  blocks: Omit<Block, "created_at" | "updated_at">[],
): void {
  if (!hasBlock(pageId)) replacePageBlocks(pageId, blocks);
}

// ─── Surgical Editor Ops ──────────────────────────────────────────────────────
// These are the building blocks for a Notion-style editor:
// every keystroke, drag-and-drop, or AI patch calls one of these.

/**
 * Insert a single new block.
 * The caller is responsible for updating the parent's `content` array
 * (or use moveBlock / replacePageBlocks for structural changes).
 */
export function insertBlock(
  block: Omit<Block, "created_at" | "updated_at">,
): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO blocks (id, type, props, content, parent_id, position, created_at, updated_at)
    VALUES (@id, @type, @props, @content, @parent_id, @position, @created_at, @updated_at)
  `,
  ).run({
    id: block.id,
    type: block.type as string,
    props: JSON.stringify(block.props),
    content: JSON.stringify(block.content),
    parent_id: block.parent_id,
    position: block.position,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Patch a block's type, props, or content array.
 * Only the supplied keys are updated.
 */
export function updateBlock(
  id: string,
  patch: Partial<Pick<Block, "type" | "props" | "content">>,
): void {
  const db = getDb();
  const now = Date.now();
  const sets: string[] = ["updated_at = @updated_at"];
  const params: Record<string, unknown> = { id, updated_at: now };

  if (patch.type !== undefined) {
    sets.push("type    = @type");
    params.type = patch.type as string;
  }
  if (patch.props !== undefined) {
    sets.push("props   = @props");
    params.props = JSON.stringify(patch.props);
  }
  if (patch.content !== undefined) {
    sets.push("content = @content");
    params.content = JSON.stringify(patch.content);
  }

  db.prepare(`UPDATE blocks SET ${sets.join(", ")} WHERE id = @id`).run(params);
}

/**
 * Delete a block and all of its descendants (recursive CTE).
 * Also removes the block's ID from its parent's `content` array.
 */
export function deleteBlock(id: string): void {
  const db = getDb();

  // Find the parent before deleting so we can patch its content array
  const row = db
    .prepare("SELECT parent_id, id FROM blocks WHERE id = ?")
    .get(id) as { parent_id: string | null; id: string } | undefined;

  db.transaction(() => {
    // Delete the subtree
    db.prepare(
      `
      WITH RECURSIVE to_delete AS (
        SELECT id FROM blocks WHERE id = ?
        UNION ALL
        SELECT b.id FROM blocks b
        INNER JOIN to_delete t ON b.parent_id = t.id
      )
      DELETE FROM blocks WHERE id IN (SELECT id FROM to_delete)
    `,
    ).run(id);

    // Remove from parent's content array
    if (row?.parent_id) {
      const parent = db
        .prepare("SELECT content FROM blocks WHERE id = ?")
        .get(row.parent_id) as { content: string } | undefined;
      if (parent) {
        const newContent = (JSON.parse(parent.content) as string[]).filter(
          (cid) => cid !== id,
        );
        db.prepare(
          "UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?",
        ).run(JSON.stringify(newContent), Date.now(), row.parent_id);
      }
    }
  })();
}

/**
 * Move a block to a new parent at a given position.
 * Updates old parent's content array, new parent's content array, and the
 * block's own parent_id + position.
 */
export function moveBlock(
  id: string,
  newParentId: string,
  newPosition: number,
): void {
  const db = getDb();
  const now = Date.now();

  const moving = db
    .prepare("SELECT parent_id FROM blocks WHERE id = ?")
    .get(id) as { parent_id: string | null } | undefined;
  if (!moving) return;

  db.transaction(() => {
    // Remove from old parent
    if (moving.parent_id) {
      const oldParent = db
        .prepare("SELECT content FROM blocks WHERE id = ?")
        .get(moving.parent_id) as { content: string } | undefined;
      if (oldParent) {
        const oldContent = (JSON.parse(oldParent.content) as string[]).filter(
          (cid) => cid !== id,
        );
        db.prepare(
          "UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?",
        ).run(JSON.stringify(oldContent), now, moving.parent_id);
      }
    }

    // Add to new parent
    const newParent = db
      .prepare("SELECT content FROM blocks WHERE id = ?")
      .get(newParentId) as { content: string } | undefined;
    if (newParent) {
      const newContent = JSON.parse(newParent.content) as string[];
      newContent.splice(newPosition, 0, id);
      db.prepare(
        "UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?",
      ).run(JSON.stringify(newContent), now, newParentId);
    }

    // Update the block itself
    db.prepare(
      "UPDATE blocks SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?",
    ).run(newParentId, newPosition, now, id);
  })();
}

/**
 * Walk up the parent_id chain from a block.
 * Returns ancestors ordered from root → immediate parent (not including the block itself).
 * Used for breadcrumb trails.
 */
export function getAncestors(id: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
    WITH RECURSIVE ancestors AS (
      SELECT * FROM blocks WHERE id = (SELECT parent_id FROM blocks WHERE id = ?)
      UNION ALL
      SELECT b.* FROM blocks b
      INNER JOIN ancestors a ON b.id = (SELECT parent_id FROM blocks WHERE id = a.id)
    )
    SELECT * FROM ancestors
  `,
    )
    .all(id) as BlockRow[];

  // The CTE returns them child-first; reverse to get root-first order
  return rows.map(rowToBlock).reverse();
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/** Get all blocks of a given type across the entire database. */
export function getBlocksByType(type: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM blocks WHERE type = ? ORDER BY position")
    .all(type) as BlockRow[];
  return rows.map(rowToBlock);
}

/**
 * Get blocks of a given type plus all their descendants.
 * Returns BlockNodes with children populated — ready to render.
 */
export function getBlocksWithChildren(type: string): BlockNode[] {
  const db = getDb();
  // First get the matching blocks
  const parents = db
    .prepare("SELECT * FROM blocks WHERE type = ? ORDER BY position")
    .all(type) as BlockRow[];

  return parents.map((parent) => {
    // Fetch the subtree for each match
    const rows = db
      .prepare(
        `
      WITH RECURSIVE tree AS (
        SELECT * FROM blocks WHERE id = ?
        UNION ALL
        SELECT b.* FROM blocks b
        INNER JOIN tree t ON b.parent_id = t.id
      )
      SELECT * FROM tree
    `,
      )
      .all(parent.id) as BlockRow[];
    const blocks = rows.map(rowToBlock);
    const tree = buildTree(blocks);
    return tree[0];
  });
}

/** Count blocks grouped by type. */
export function getBlockTypeCounts(): { type: string; count: number }[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT type, COUNT(*) as count FROM blocks GROUP BY type ORDER BY count DESC",
    )
    .all() as { type: string; count: number }[];
}

/** Full-text search across all text blocks (props.text contains the query). */
export function searchBlocks(query: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'text' AND json_extract(props, '$.text') LIKE ? ORDER BY position",
    )
    .all(`%${query}%`) as BlockRow[];
  return rows.map(rowToBlock);
}

// ─── Comment Helpers ──────────────────────────────────────────────────────────

/**
 * Get approved comment blocks for a page (public-facing).
 * Returns newest first (by created_at DESC).
 */
export function getComments(pageId: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'comment' AND parent_id = ? AND json_extract(props, '$.approved') = 1 ORDER BY created_at DESC",
    )
    .all(pageId) as BlockRow[];
  return rows.map(rowToBlock);
}

/**
 * Get ALL comment blocks for a page — including pending (unapproved).
 * Admin-only. Returns newest first.
 */
export function getAllComments(pageId: string): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'comment' AND parent_id = ? ORDER BY created_at DESC",
    )
    .all(pageId) as BlockRow[];
  return rows.map(rowToBlock);
}

/**
 * Get all pending (unapproved) comments across the entire database.
 * Used for the admin moderation queue.
 */
export function getPendingComments(): Block[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM blocks WHERE type = 'comment' AND json_extract(props, '$.approved') != 1 ORDER BY created_at DESC",
    )
    .all() as BlockRow[];
  return rows.map(rowToBlock);
}

/**
 * Approve a comment by setting approved: true in its props.
 */
export function approveComment(id: string): void {
  const block = getBlock(id);
  if (!block || block.type !== "comment") return;
  updateBlock(id, {
    props: { ...block.props, approved: true },
  });
}

/**
 * Add a comment block to a page. Creates the block and appends it to
 * the parent's content array in one transaction.
 * Returns the new comment block.
 */
export function addComment(
  pageId: string,
  opts: { name?: string; text: string },
): Block {
  const { nanoid } = require("nanoid");
  const db = getDb();
  const now = Date.now();
  const id = nanoid();

  const block = {
    id,
    type: "comment" as const,
    props: {
      name: opts.name || "Anonymous",
      text: opts.text,
      timestamp: new Date(now).toISOString(),
      approved: false,
    },
    content: [] as string[],
    parent_id: pageId,
    position: 0, // comments are ordered by created_at, position is irrelevant
    created_at: now,
    updated_at: now,
  };

  db.transaction(() => {
    // Insert the comment block
    db.prepare(
      `INSERT INTO blocks (id, type, props, content, parent_id, position, created_at, updated_at)
       VALUES (@id, @type, @props, @content, @parent_id, @position, @created_at, @updated_at)`,
    ).run({
      ...block,
      props: JSON.stringify(block.props),
      content: JSON.stringify(block.content),
    });

    // Append to parent's content array
    const parent = db
      .prepare("SELECT content FROM blocks WHERE id = ?")
      .get(pageId) as { content: string } | undefined;
    if (parent) {
      const content = JSON.parse(parent.content) as string[];
      content.push(id);
      db.prepare(
        "UPDATE blocks SET content = ?, updated_at = ? WHERE id = ?",
      ).run(JSON.stringify(content), now, pageId);
    }
  })();

  return {
    ...block,
    props: block.props as Record<string, unknown>,
  };
}
