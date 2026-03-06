/**
 * Admin Comment Endpoints
 *
 * PATCH  /api/comments/[id] — approve a comment (admin only)
 * DELETE /api/comments/[id] — delete a comment (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hasBlock, approveComment, deleteBlock, getBlock } from "@/lib/blocks/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const err = requireAdmin(req);
  if (err) return err;

  const { id } = await params;

  const block = getBlock(id);
  if (!block || block.type !== "comment") {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  approveComment(id);
  return NextResponse.json({ success: true, message: "Comment approved" });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const err = requireAdmin(req);
  if (err) return err;

  const { id } = await params;

  if (!hasBlock(id)) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  deleteBlock(id);
  return NextResponse.json({ success: true, message: "Comment deleted" });
}
