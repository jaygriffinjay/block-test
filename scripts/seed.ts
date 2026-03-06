#!/usr/bin/env npx tsx
/**
 * Seed the database with content from markdown files.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * This creates:
 *   1. A workspace root page
 *   2. Child pages from each .md file in content/
 *
 * Re-running replaces existing pages (fresh data each time).
 * For idempotent "only if missing" seeding, use the --once flag.
 */

import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { mdToBlocks } from "../src/lib/blocks/md";
import { replacePageBlocks, getDb } from "../src/lib/blocks/db";

// ── Config ────────────────────────────────────────────────────────────────────

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKSPACE_TITLE = "My Workspace";
const WORKSPACE_ICON = "🏠";

interface PageDef {
  file: string;
  icon?: string;
}

// Define pages in order — slug and title are inferred from the file
const PAGES: PageDef[] = [
  { file: "getting-started.md", icon: "👋" },
  { file: "block-system.md", icon: "🧱" },
  { file: "experiments.md", icon: "🧪" },
];

// ── Seed ──────────────────────────────────────────────────────────────────────

const db = getDb();

// Create workspace root
const workspaceId = "ws_root";
const childPageIds: string[] = [];
const allBlocks: Parameters<typeof replacePageBlocks>[1] = [];

for (let i = 0; i < PAGES.length; i++) {
  const def = PAGES[i];
  const filePath = path.join(CONTENT_DIR, def.file);

  if (!fs.existsSync(filePath)) {
    console.error(`⚠ File not found: ${filePath}, skipping`);
    continue;
  }

  const markdown = fs.readFileSync(filePath, "utf-8");
  const basename = path.basename(def.file, ".md");
  const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? basename;

  const { pageId, blocks } = mdToBlocks(markdown, {
    title,
    icon: def.icon,
    slug: basename,
  });

  // Re-parent the page block under the workspace
  const pageBlock = blocks.find((b) => b.id === pageId)!;
  pageBlock.parent_id = workspaceId;
  pageBlock.position = i;

  childPageIds.push(pageId);
  allBlocks.push(...blocks);

  console.log(`  ✓ ${def.icon ?? "📄"} ${title} → ${blocks.length} blocks`);
}

// Add the workspace root itself
allBlocks.push({
  id: workspaceId,
  type: "page",
  props: { title: WORKSPACE_TITLE, icon: WORKSPACE_ICON },
  content: childPageIds,
  parent_id: null,
  position: 0,
});

// Write everything in one transaction
replacePageBlocks(workspaceId, allBlocks);

console.log(
  `\n✓ Seeded workspace "${WORKSPACE_TITLE}" with ${PAGES.length} pages (${allBlocks.length} total blocks)`,
);
