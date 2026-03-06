"use client";

/**
 * PageSidebar — recursive tree nav for nested pages.
 *
 * Shows a collapsible tree of all pages starting from the workspace root.
 * The active page is highlighted. Each page shows its icon + title.
 */

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus, FileText } from "lucide-react";
import type { BlockProps } from "@/lib/blocks/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageTreeNode {
  id: string;
  props: BlockProps;
  children: PageTreeNode[];
}

interface PageSidebarProps {
  tree: PageTreeNode[];
  activePageId: string;
  onCreatePage?: (parentId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageSidebar({
  tree,
  activePageId,
  onCreatePage,
}: PageSidebarProps) {
  return (
    <nav className="w-60 shrink-0 border-r bg-muted/30 p-3 overflow-y-auto">
      <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3 px-2">
        Pages
      </p>
      <div className="space-y-0.5">
        {tree.map((node) => (
          <PageTreeItem
            key={node.id}
            node={node}
            depth={0}
            activePageId={activePageId}
            onCreatePage={onCreatePage}
          />
        ))}
      </div>
    </nav>
  );
}

// ─── Recursive tree item ──────────────────────────────────────────────────────

function PageTreeItem({
  node,
  depth,
  activePageId,
  onCreatePage,
}: {
  node: PageTreeNode;
  depth: number;
  activePageId: string;
  onCreatePage?: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isActive = node.id === activePageId;
  const hasChildren = node.children.length > 0;
  const icon = (node.props.icon as string) || "";
  const title = (node.props.title as string) || "Untitled";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Chevron / spacer */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "shrink-0 p-0.5 rounded hover:bg-accent transition-transform",
            hasChildren ? "visible" : "invisible",
            expanded && "rotate-90",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Page link */}
        <Link
          href={`/pages/${node.id}`}
          className="flex-1 flex items-center gap-1.5 truncate min-w-0"
        >
          {icon ? (
            <span className="text-sm shrink-0">{icon}</span>
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
          <span className="truncate">{title}</span>
        </Link>

        {/* Add sub-page button */}
        {onCreatePage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage(node.id);
            }}
            className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            title="Add sub-page"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <PageTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activePageId={activePageId}
              onCreatePage={onCreatePage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
