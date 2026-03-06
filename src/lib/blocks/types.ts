/**
 * Block System Types
 *
 * Inspired by Notion's block data model:
 * https://www.notion.com/blog/data-model-behind-notion
 *
 * Every unit of content is a block. Blocks are flat records stored in SQLite.
 * The tree structure is expressed through `content` (ordered child IDs, downward
 * pointers) and `parent_id` (upward pointer for permissions / ancestry).
 *
 * Rendering takes the flat list, builds a tree in memory, then recurses.
 *
 * Block types are intentionally minimal — page + typography only.
 * shadcn/ui component types are added in a separate registry as needed.
 */

// ─── Block Types ──────────────────────────────────────────────────────────────

export type BlockType =
  // ── Page container ──────────────────────────────────────────────
  | "page" // workspace/document root; props: { title, icon?, slug? }

  // ── Block-level elements ────────────────────────────────────────
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "paragraph"
  | "blockquote"
  | "list" // props: { ordered?: boolean }
  | "list_item"
  | "divider" // <hr>, no children

  // ── Inline marks (wrap a text leaf) ────────────────────────────
  | "text" // leaf — plain text, props: { text: string }
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "highlight"
  | "inline_code"
  | "small"
  | "link" // props: { href: string, target?: "_blank" | "_self" }

  // ── Interactive ────────────────────────────────────────────────
  | "comment"; // props: { name, text, timestamp }

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PageProps {
  title: string;
  icon?: string; // emoji or image url
  slug?: string;
}

export interface TextProps {
  text: string;
}

export interface LinkProps {
  href: string;
  target?: "_blank" | "_self";
}

export interface ListProps {
  ordered?: boolean;
}

export interface CommentProps {
  /** Display name — anonymous if omitted */
  name?: string;
  /** Comment body text */
  text: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Admin must approve before it shows publicly */
  approved: boolean;
}

/** Open-ended catch-all — any block type can carry arbitrary props */
export type BlockProps = Record<string, unknown>;

// ─── Core Block record (matches the SQLite row exactly) ──────────────────────

export interface Block {
  /** nanoid — e.g. "V1StGXR8_Z5jdHi6B-myT" */
  id: string;
  type: BlockType;
  /** Arbitrary JSON stored as TEXT in SQLite */
  props: BlockProps;
  /** Ordered array of child block IDs (downward pointers) */
  content: string[];
  /** ID of the parent block — null for workspace roots */
  parent_id: string | null;
  /** Sort order among siblings */
  position: number;
  /** Epoch ms */
  created_at: number;
  updated_at: number;
}

/** Raw SQLite row before JSON parsing */
export interface BlockRow {
  id: string;
  type: string;
  props: string; // JSON string
  content: string; // JSON string: string[]
  parent_id: string | null;
  position: number;
  created_at: number;
  updated_at: number;
}

// ─── Tree node (used by the renderer) ──────────────────────────────────────────

export interface BlockNode extends Block {
  children: BlockNode[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────

export function rowToBlock(row: BlockRow): Block {
  return {
    ...row,
    type: row.type as BlockType,
    props: JSON.parse(row.props) as BlockProps,
    content: JSON.parse(row.content) as string[],
  };
}

/**
 * Build a tree from a flat list of blocks.
 * Preserves sibling order via `position`.
 */
export function buildTree(blocks: Block[]): BlockNode[] {
  const map = new Map<string, BlockNode>();
  for (const b of blocks) {
    map.set(b.id, { ...b, children: [] });
  }

  const roots: BlockNode[] = [];

  for (const node of map.values()) {
    if (node.parent_id === null || !map.has(node.parent_id)) {
      roots.push(node);
    } else {
      map.get(node.parent_id)!.children.push(node);
    }
  }

  function sort(node: BlockNode) {
    node.children.sort((a, b) => a.position - b.position);
    node.children.forEach(sort);
  }
  roots.sort((a, b) => a.position - b.position);
  roots.forEach(sort);

  return roots;
}
