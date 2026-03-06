/**
 * Comment API
 *
 * GET  /api/comments?page=<id>           — list approved comments (public)
 * GET  /api/comments?page=<id>&all=true  — list ALL comments incl. pending (admin)
 * GET  /api/comments?pending=true        — list all pending comments across DB (admin)
 * POST /api/comments                     — submit a comment (public, rate-limited)
 *   body: { pageId: string, name?: string, text: string }
 *
 * No auth required for reading approved comments or posting.
 * Admin token required for viewing pending / all comments.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getComments,
  getAllComments,
  getPendingComments,
  addComment,
  hasBlock,
} from "@/lib/blocks/db";
import { isAdmin } from "@/lib/auth";

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
const rateMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

function isRateLimited(ip: string): boolean {
  const last = rateMap.get(ip);
  if (last && Date.now() - last < RATE_LIMIT_MS) return true;
  rateMap.set(ip, Date.now());
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Admin: get all pending comments across entire DB
  if (searchParams.get("pending") === "true") {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const comments = getPendingComments();
    return NextResponse.json({ comments });
  }

  const pageId = searchParams.get("page");
  if (!pageId) {
    return NextResponse.json(
      { error: "?page=<id> query param is required" },
      { status: 400 },
    );
  }

  // Admin: get all comments (including pending) for a page
  if (searchParams.get("all") === "true" && isAdmin(req)) {
    const comments = getAllComments(pageId);
    return NextResponse.json({ comments });
  }

  // Public: approved comments only
  const comments = getComments(pageId);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many comments. Please wait a few seconds." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pageId, name, text } = body as {
    pageId?: string;
    name?: string;
    text?: string;
  };

  if (!pageId || typeof pageId !== "string") {
    return NextResponse.json(
      { error: "pageId is required" },
      { status: 400 },
    );
  }
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "text is required and cannot be empty" },
      { status: 400 },
    );
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Comment text must be 2000 characters or less" },
      { status: 400 },
    );
  }
  if (name && typeof name === "string" && name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 100 characters or less" },
      { status: 400 },
    );
  }

  if (!hasBlock(pageId)) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const comment = addComment(pageId, {
    name: name?.trim() || undefined,
    text: text.trim(),
  });

  return NextResponse.json(
    {
      comment,
      message: "Comment submitted! It will appear after review.",
    },
    { status: 201 },
  );
}
