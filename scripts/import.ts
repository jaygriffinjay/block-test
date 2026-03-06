#!/usr/bin/env npx tsx
/**
 * Import a markdown file into the block database.
 *
 * Usage:
 *   npx tsx scripts/import.ts content/getting-started.md --title "Getting Started" --icon "👋"
 *   npx tsx scripts/import.ts content/*.md              (bulk — infers title from first h1)
 *
 * Flags:
 *   --title  Page title (defaults to first # heading or filename)
 *   --icon   Emoji icon for the page
 *   --slug   URL slug (defaults to filename without extension)
 */

import fs from "fs";
import path from "path";
import { mdToBlocks } from "../src/lib/blocks/md";
import { replacePageBlocks, hasBlock, getDb } from "../src/lib/blocks/db";

// ── Parse args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const files: string[] = [];
let title: string | undefined;
let icon: string | undefined;
let slug: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--title" && args[i + 1]) {
    title = args[++i];
    continue;
  }
  if (args[i] === "--icon" && args[i + 1]) {
    icon = args[++i];
    continue;
  }
  if (args[i] === "--slug" && args[i + 1]) {
    slug = args[++i];
    continue;
  }
  files.push(args[i]);
}

if (files.length === 0) {
  console.error(
    "Usage: npx tsx scripts/import.ts <file.md> [--title T] [--icon I] [--slug S]",
  );
  process.exit(1);
}

// ── Import each file ──────────────────────────────────────────────────────────

// Ensure DB is initialized
getDb();

for (const file of files) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }

  const markdown = fs.readFileSync(filePath, "utf-8");
  const basename = path.basename(filePath, path.extname(filePath));

  // Infer title from first # heading if not provided
  const inferredTitle = title ?? markdown.match(/^#\s+(.+)$/m)?.[1] ?? basename;
  const inferredSlug = slug ?? basename;

  const { pageId, blocks } = mdToBlocks(markdown, {
    title: inferredTitle,
    icon,
    slug: inferredSlug,
  });

  replacePageBlocks(pageId, blocks);
  console.log(
    `✓ Imported "${inferredTitle}" → ${blocks.length} blocks (page: ${pageId})`,
  );
}
