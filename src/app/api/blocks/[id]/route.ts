/**
 * GET    /api/blocks/[id] — fetch a single page's full block tree
 * PATCH  /api/blocks/[id] — update a block's type, props, or content
 * DELETE /api/blocks/[id] — delete a block and its descendants
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getBlockTree,
  updateBlock,
  deleteBlock,
  hasBlock,
} from "@/lib/blocks/db";
import type { BlockType } from "@/lib/blocks/types";
import { requireAdmin } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const blocks = getBlockTree(id);
  if (!blocks.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ blocks });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const err = requireAdmin(req);
  if (err) return err;

  const { id } = await params;

  if (!hasBlock(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    type?: string;
    props?: Record<string, unknown>;
    content?: string[];
  };

  updateBlock(id, {
    ...body,
    type: body.type as BlockType | undefined,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const err = requireAdmin(_req);
  if (err) return err;

  const { id } = await params;

  if (!hasBlock(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  deleteBlock(id);
  return NextResponse.json({ success: true });
}
