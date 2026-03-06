/**
 * Admin Auth Helper
 *
 * Single env var: ADMIN_TOKEN in .env.local (gitignored).
 * All write operations on blocks + comment moderation check this.
 *
 * Usage:
 *   import { requireAdmin } from "@/lib/auth";
 *   const err = requireAdmin(req);
 *   if (err) return err;
 */

import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

/**
 * Check the Authorization header for a valid admin token.
 * Returns a 401/403 NextResponse if invalid, or null if authorized.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!ADMIN_TOKEN) {
    // If no token is configured, reject all admin requests for safety.
    // (Don't silently allow everything — that's how security holes happen.)
    return NextResponse.json(
      { error: "ADMIN_TOKEN is not configured on the server" },
      { status: 500 },
    );
  }

  const header = req.headers.get("authorization");
  if (!header) {
    return NextResponse.json(
      { error: "Authorization header is required" },
      { status: 401 },
    );
  }

  const token = header.replace(/^Bearer\s+/i, "");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
  }

  return null; // authorized
}

/**
 * Check if a request has a valid admin token (non-throwing).
 * Useful for conditional logic — e.g. show pending comments to admin only.
 */
export function isAdmin(req: NextRequest): boolean {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  return header.replace(/^Bearer\s+/i, "") === ADMIN_TOKEN;
}
