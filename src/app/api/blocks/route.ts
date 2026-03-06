/**
 * GET  /api/blocks           — list all page blocks
 * GET  /api/blocks?tree=<id> — full subtree as flat JSON
 * POST /api/blocks           — create a single block (or replace a page tree)
 *   body: { block: Block }               — insert one block
 *   body: { pageId: string, blocks[] }   — replace entire page tree (legacy)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getBlockTree,
  listPages,
  replacePageBlocks,
  insertBlock,
  updateBlock,
} from "@/lib/blocks/db";
import type { Block } from "@/lib/blocks/types";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const treeId = searchParams.get("tree");

  if (treeId) {
    const blocks = getBlockTree(treeId);
    return NextResponse.json({ blocks });
  }

  const pages = listPages();
  return NextResponse.json({ blocks: pages });
}

export async function POST(req: NextRequest) {
  const err = requireAdmin(req);
  if (err) return err;

  const body = await req.json();

  // ── Single block insert ──────────────────────────────────────────
  if (body.block) {
    const b = body.block as Omit<Block, "created_at" | "updated_at">;
    if (!b.id || !b.type) {
      return NextResponse.json(
        { error: "block.id and block.type are required" },
        { status: 400 },
      );
    }

    insertBlock(b);

    // If the block has a parent, append its ID to the parent's content array
    if (b.parent_id) {
      const parentTree = getBlockTree(b.parent_id);
      const parent = parentTree.find((bl) => bl.id === b.parent_id);
      if (parent) {
        const newContent = [...parent.content, b.id];
        updateBlock(b.parent_id, { content: newContent });
      }
    }

    return NextResponse.json({ success: true, id: b.id });
  }

  // ── Full page tree replace (legacy) ──────────────────────────────
  const { pageId, blocks } = body as { pageId: string; blocks: Block[] };

  if (!pageId || !Array.isArray(blocks)) {
    return NextResponse.json(
      { error: "pageId and blocks[] are required" },
      { status: 400 },
    );
  }

  replacePageBlocks(pageId, blocks);
  return NextResponse.json({ success: true, count: blocks.length });
}
