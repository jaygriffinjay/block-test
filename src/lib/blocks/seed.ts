/**
 * Seed — imports markdown files from content/ into the block database.
 *
 * This is a thin wrapper around mdToBlocks + replacePageBlocks for use
 * at runtime (e.g. called from a server component on first visit).
 *
 * For CLI seeding, use: npx tsx scripts/seed.ts
 */

import fs from "fs";
import path from "path";
import { mdToBlocks } from "./md";
import { replacePageBlocks, hasBlock } from "./db";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKSPACE_ID = "ws_root";
const WORKSPACE_TITLE = "My Workspace";
const WORKSPACE_ICON = "🏠";

interface PageDef {
  file: string;
  icon?: string;
}

const PAGES: PageDef[] = [
  { file: "getting-started.md", icon: "👋" },
  { file: "block-system.md", icon: "🧱" },
  { file: "experiments.md", icon: "🧪" },
];

// ─── Exported seed function ───────────────────────────────────────────────────

export { WORKSPACE_ID };

/**
 * Seed the workspace from markdown files. No-op if workspace already exists.
 */
export function seedWorkspace(): void {
  if (hasBlock(WORKSPACE_ID)) return;

  const childPageIds: string[] = [];
  const allBlocks: Parameters<typeof replacePageBlocks>[1] = [];

  for (let i = 0; i < PAGES.length; i++) {
    const def = PAGES[i];
    const filePath = path.join(CONTENT_DIR, def.file);

    if (!fs.existsSync(filePath)) continue;

    const markdown = fs.readFileSync(filePath, "utf-8");
    const basename = path.basename(def.file, ".md");
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? basename;

    const { pageId, blocks } = mdToBlocks(markdown, {
      title,
      icon: def.icon,
      slug: basename,
    });

    // Re-parent page under workspace
    const pageBlock = blocks.find((b) => b.id === pageId)!;
    pageBlock.parent_id = WORKSPACE_ID;
    pageBlock.position = i;

    childPageIds.push(pageId);
    allBlocks.push(...blocks);
  }

  // Workspace root
  allBlocks.push({
    id: WORKSPACE_ID,
    type: "page",
    props: { title: WORKSPACE_TITLE, icon: WORKSPACE_ICON },
    content: childPageIds,
    parent_id: null,
    position: 0,
  });

  replacePageBlocks(WORKSPACE_ID, allBlocks);
}
