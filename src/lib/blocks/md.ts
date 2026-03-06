/**
 * Markdown → Block converter
 *
 * Takes a markdown string, parses it into an MDAST, walks the tree,
 * and produces a flat array of Block records ready to insert into SQLite.
 *
 * Usage:
 *   import { mdToBlocks } from "@/lib/blocks/md";
 *   const { pageId, blocks } = mdToBlocks(markdownString, { title: "My Page" });
 *   replacePageBlocks(pageId, blocks);
 */

import { fromMarkdown } from "mdast-util-from-markdown";
import { nanoid } from "nanoid";
import type { Block, BlockType } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageMeta {
  title: string;
  icon?: string;
  slug?: string;
}

interface ConvertResult {
  /** The root page block ID */
  pageId: string;
  /** Flat array of blocks — ready to pass to replacePageBlocks() */
  blocks: Omit<Block, "created_at" | "updated_at">[];
}

// ─── MDAST node type → BlockType mapping ──────────────────────────────────────

function headingType(depth: number): BlockType {
  const map: Record<number, BlockType> = {
    1: "h1",
    2: "h2",
    3: "h3",
    4: "h4",
    5: "h5",
    6: "h6",
  };
  return map[depth] ?? "h6";
}

// ─── Core converter ───────────────────────────────────────────────────────────

export function mdToBlocks(markdown: string, meta: PageMeta): ConvertResult {
  const tree = fromMarkdown(markdown);
  const blocks: Omit<Block, "created_at" | "updated_at">[] = [];

  function makeBlock(
    type: BlockType,
    props: Block["props"],
    childIds: string[],
    parentId: string | null,
    position: number,
  ): string {
    const id = nanoid();
    blocks.push({
      id,
      type,
      props,
      content: childIds,
      parent_id: parentId,
      position,
    });
    return id;
  }

  /**
   * Recursively convert an MDAST node into one or more blocks.
   * Returns the block ID of the root block created for this node.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function convert(
    node: any,
    parentId: string | null,
    position: number,
  ): string {
    switch (node.type) {
      // ── Block-level ───────────────────────────────────────────
      case "heading": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock(
          headingType(node.depth),
          {},
          [],
          parentId,
          position,
        );
        // re-parent children
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "paragraph": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("paragraph", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "blockquote": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("blockquote", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "list": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock(
          "list",
          { ordered: !!node.ordered },
          [],
          parentId,
          position,
        );
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "listItem": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("list_item", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "thematicBreak": {
        return makeBlock("divider", {}, [], parentId, position);
      }

      // ── Inline marks ──────────────────────────────────────────
      case "strong": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("bold", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "emphasis": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("italic", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "delete": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock("strikethrough", {}, [], parentId, position);
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      case "inlineCode": {
        const textId = makeBlock("text", { text: node.value }, [], null, 0);
        const id = makeBlock("inline_code", {}, [textId], parentId, position);
        blocks.find((b) => b.id === textId)!.parent_id = id;
        return id;
      }

      case "link": {
        const childIds = convertChildren(node.children, null);
        const id = makeBlock(
          "link",
          { href: node.url },
          [],
          parentId,
          position,
        );
        for (let i = 0; i < childIds.length; i++) {
          const child = blocks.find((b) => b.id === childIds[i])!;
          child.parent_id = id;
          child.position = i;
        }
        blocks.find((b) => b.id === id)!.content = childIds;
        return id;
      }

      // ── Leaf ──────────────────────────────────────────────────
      case "text": {
        return makeBlock("text", { text: node.value }, [], parentId, position);
      }

      // ── Fallback: skip unsupported nodes, convert children ────
      default: {
        if (node.children) {
          const childIds = convertChildren(node.children, parentId);
          return (
            childIds[0] ??
            makeBlock("text", { text: "" }, [], parentId, position)
          );
        }
        // Leaf node we don't handle (e.g. image, html) — render as text
        return makeBlock(
          "text",
          { text: node.value ?? "" },
          [],
          parentId,
          position,
        );
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function convertChildren(children: any[], parentId: string | null): string[] {
    return children.map((child, i) => convert(child, parentId, i));
  }

  // ── Build page ────────────────────────────────────────────────────

  // Convert all top-level MDAST children
  const topChildIds = convertChildren(tree.children, null);

  // Create the page block
  const pageId = nanoid();
  blocks.push({
    id: pageId,
    type: "page",
    props: {
      title: meta.title,
      ...(meta.icon && { icon: meta.icon }),
      ...(meta.slug && { slug: meta.slug }),
    },
    content: topChildIds,
    parent_id: null,
    position: 0,
  });

  // Re-parent top-level children to the page
  for (let i = 0; i < topChildIds.length; i++) {
    const child = blocks.find((b) => b.id === topChildIds[i])!;
    child.parent_id = pageId;
    child.position = i;
  }

  return { pageId, blocks };
}
