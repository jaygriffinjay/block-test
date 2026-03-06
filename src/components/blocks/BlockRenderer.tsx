"use client";

/**
 * BlockRenderer
 *
 * Maps every BlockType to its React component.
 * Covers page + typography only.
 *
 * Usage:
 *   import { BlockRenderer } from "@/components/blocks/BlockRenderer";
 *   <BlockRenderer node={rootNode} />
 */

import React from "react";
import { cn } from "@/lib/utils";
import { useBlockTheme } from "./BlockTheme";

// ── Typography ─────────────────────────────────────────────────────────────
import {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlight,
  InlineCode,
  Small,
  Paragraph,
  Blockquote,
  List,
  ListItem,
  Link,
} from "@/components/typography";

import type { BlockNode } from "@/lib/blocks/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface BlockRendererProps {
  node: BlockNode;
}

function Children({ nodes }: { nodes: BlockNode[] }) {
  return (
    <>
      {nodes.map((child) => (
        <BlockRenderer key={child.id} node={child} />
      ))}
    </>
  );
}

type P = Record<string, unknown>;

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function BlockRenderer({ node }: BlockRendererProps) {
  const p = node.props as P;
  const kids = <Children nodes={node.children} />;
  const { overrides } = useBlockTheme();

  // Merge: theme override for this block type + per-block className from props
  const cls = cn(overrides[node.type], p.className as string | undefined);

  switch (node.type) {
    // ── Leaf ──────────────────────────────────────────────────────────────
    case "text":
      return cls ? (
        <span className={cls}>{(p.text as string) ?? ""}</span>
      ) : (
        <>{(p.text as string) ?? ""}</>
      );

    // ── Typography ────────────────────────────────────────────────────────
    case "h1":
      return <H1 className={cls}>{kids}</H1>;
    case "h2":
      return <H2 className={cls}>{kids}</H2>;
    case "h3":
      return <H3 className={cls}>{kids}</H3>;
    case "h4":
      return <H4 className={cls}>{kids}</H4>;
    case "h5":
      return <H5 className={cls}>{kids}</H5>;
    case "h6":
      return <H6 className={cls}>{kids}</H6>;
    case "paragraph":
      return <Paragraph className={cls}>{kids}</Paragraph>;
    case "blockquote":
      return <Blockquote className={cls}>{kids}</Blockquote>;
    case "bold":
      return <Bold className={cls}>{kids}</Bold>;
    case "italic":
      return <Italic className={cls}>{kids}</Italic>;
    case "underline":
      return <Underline className={cls}>{kids}</Underline>;
    case "strikethrough":
      return <Strikethrough className={cls}>{kids}</Strikethrough>;
    case "highlight":
      return <Highlight className={cls}>{kids}</Highlight>;
    case "inline_code":
      return <InlineCode className={cls}>{kids}</InlineCode>;
    case "small":
      return <Small className={cls}>{kids}</Small>;
    case "list":
      return (
        <List ordered={p.ordered as boolean} className={cls}>
          {kids}
        </List>
      );
    case "list_item":
      return <ListItem className={cls}>{kids}</ListItem>;
    case "link":
      return (
        <Link
          href={p.href as string}
          target={p.target as "_blank" | "_self"}
          className={cls}
        >
          {kids}
        </Link>
      );
    case "divider":
      return <hr className={cn("my-6", cls)} />;

    // ── Comment ───────────────────────────────────────────────────────────
    case "comment":
      return (
        <div className={cn("border-border border-b py-3", cls)}>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium">
              {(p.name as string) || "Anonymous"}
            </span>
            {p.timestamp ? (
              <span className="text-muted-foreground text-xs">
                {new Date(p.timestamp as string).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <p className="text-sm whitespace-pre-wrap">
            {(p.text as string) || ""}
          </p>
        </div>
      );

    // ── Page ──────────────────────────────────────────────────────────────
    case "page":
      return <div className={cn("space-y-4", cls)}>{kids}</div>;

    // ── Unknown ───────────────────────────────────────────────────────────
    default:
      return (
        <span
          data-block-type={node.type}
          className="text-destructive border-destructive rounded border px-1 text-xs"
        >
          unknown:{node.type}
        </span>
      );
  }
}

// ─── Convenience wrapper ─────────────────────────────────────────────────────

export function BlocksRenderer({ nodes }: { nodes: BlockNode[] }) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <BlockRenderer key={node.id} node={node} />
      ))}
    </div>
  );
}
