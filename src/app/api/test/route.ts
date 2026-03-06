/**
 * POST /api/test — block system debugger endpoints.
 *
 * A single route that dispatches to various test operations
 * based on `body.action`. Only meant for the /examples/test page.
 *
 * Actions:
 *   md-to-blocks   — convert markdown → blocks (no DB write)
 *   insert         — insert a block
 *   read           — read a block by ID
 *   update         — patch a block
 *   delete         — delete a block
 *   move           — move a block to a new parent
 *   tree           — get full block tree
 *   ancestors      — get ancestor chain
 *   search         — full-text search
 *   by-type        — get blocks by type
 *   type-counts    — block type distribution
 */

import { NextRequest, NextResponse } from "next/server";
import { mdToBlocks } from "@/lib/blocks/md";
import {
  getBlock,
  getBlockTree,
  insertBlock,
  updateBlock,
  deleteBlock,
  moveBlock,
  getAncestors,
  searchBlocks,
  getBlocksByType,
  getBlockTypeCounts,
} from "@/lib/blocks/db";
import { buildTree } from "@/lib/blocks/types";
import type { BlockType } from "@/lib/blocks/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    switch (action) {
      // ── MD → Blocks (no DB write) ────────────────────────────────
      case "md-to-blocks": {
        const { markdown, title, icon, slug } = body;
        const result = mdToBlocks(markdown ?? "", {
          title: title ?? "Test Page",
          icon,
          slug,
        });
        return NextResponse.json({
          pageId: result.pageId,
          blocks: result.blocks,
          count: result.blocks.length,
        });
      }

      // ── CRUD ─────────────────────────────────────────────────────
      case "insert": {
        const { block } = body;
        insertBlock(block);
        const inserted = getBlock(block.id);
        return NextResponse.json({ block: inserted });
      }

      case "read": {
        const { id } = body;
        const block = getBlock(id);
        return NextResponse.json({ block });
      }

      case "update": {
        const { id, patch } = body;
        const before = getBlock(id);
        updateBlock(id, {
          ...patch,
          type: patch.type as BlockType | undefined,
        });
        const after = getBlock(id);
        return NextResponse.json({ before, after });
      }

      case "delete": {
        const { id } = body;
        const before = getBlock(id);
        deleteBlock(id);
        const after = getBlock(id);
        return NextResponse.json({ before, after, deleted: after === null });
      }

      case "move": {
        const { id, newParentId, newPosition } = body;
        const before = getBlock(id);
        moveBlock(id, newParentId, newPosition);
        const after = getBlock(id);
        return NextResponse.json({ before, after });
      }

      // ── Tree ─────────────────────────────────────────────────────
      case "tree": {
        const { id } = body;
        const flat = getBlockTree(id);
        const tree = buildTree(flat);
        return NextResponse.json({
          flat,
          tree,
          count: flat.length,
        });
      }

      case "ancestors": {
        const { id } = body;
        const ancestors = getAncestors(id);
        return NextResponse.json({ ancestors });
      }

      // ── Queries ──────────────────────────────────────────────────
      case "search": {
        const { query } = body;
        const results = searchBlocks(query);
        return NextResponse.json({ results, count: results.length });
      }

      case "by-type": {
        const { type } = body;
        const results = getBlocksByType(type);
        return NextResponse.json({ results, count: results.length });
      }

      case "type-counts": {
        const counts = getBlockTypeCounts();
        return NextResponse.json({ counts });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
