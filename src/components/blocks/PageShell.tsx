"use client";

/**
 * PageShell — client wrapper for the /pages/[id] route.
 *
 * Receives server-fetched data as props and renders:
 *  - Sidebar (page tree nav)
 *  - Breadcrumbs
 *  - Editable block content
 *  - "Add block" / "Add sub-page" controls
 */

import React, { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { adminFetch } from "@/lib/admin-fetch";
import { PageSidebar, type PageTreeNode } from "./PageSidebar";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { EditableBlock } from "./EditableBlock";
import { ModeToggle } from "@/components/mode-toggle";
import { Plus } from "lucide-react";
import type { BlockNode } from "@/lib/blocks/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageShellProps {
  pageId: string;
  pageTree: PageTreeNode[];
  breadcrumbs: BreadcrumbItem[];
  pageNode: BlockNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageShell({
  pageId,
  pageTree,
  breadcrumbs,
  pageNode,
}: PageShellProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const handleCreatePage = useCallback(
    async (parentId: string) => {
      const newId = nanoid();
      await adminFetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: {
            id: newId,
            type: "page",
            props: { title: "Untitled", icon: "📄" },
            content: [],
            parent_id: parentId,
            position: Date.now(), // append to end
          },
        }),
      });
      startTransition(() => {
        router.refresh();
        router.push(`/pages/${newId}`);
      });
    },
    [router],
  );

  const handleAddBlock = useCallback(
    async (type: string) => {
      const newId = nanoid();
      const textId = nanoid();

      if (type === "divider") {
        await adminFetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: {
              id: newId,
              type: "divider",
              props: {},
              content: [],
              parent_id: pageId,
              position: Date.now(),
            },
          }),
        });
      } else {
        // Create text child first, then the container block
        await adminFetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: {
              id: textId,
              type: "text",
              props: { text: "" },
              content: [],
              parent_id: newId,
              position: 0,
            },
          }),
        });
        await adminFetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: {
              id: newId,
              type,
              props: {},
              content: [textId],
              parent_id: pageId,
              position: Date.now(),
            },
          }),
        });
      }

      refresh();
    },
    [pageId, refresh],
  );

  // Editable title
  const icon = (pageNode.props.icon as string) || "";
  const title = (pageNode.props.title as string) || "Untitled";

  // Content children = non-page children (pages show as links at the bottom)
  const contentChildren = pageNode.children.filter((c) => c.type !== "page");
  const childPages = pageNode.children.filter((c) => c.type === "page");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <PageSidebar
        tree={pageTree}
        activePageId={pageId}
        onCreatePage={handleCreatePage}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-12 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <Breadcrumbs items={breadcrumbs} />
            <ModeToggle />
          </div>

          {/* Page title */}
          <PageTitle pageId={pageId} icon={icon} title={title} onMutate={refresh} />

          {/* Content blocks */}
          <div className="mt-8 space-y-1 pl-10">
            {contentChildren.map((child) => (
              <EditableBlock
                key={child.id}
                node={child}
                pageId={pageId}
                onMutate={refresh}
              />
            ))}

            {contentChildren.length === 0 && (
              <p className="text-muted-foreground text-sm italic py-4">
                Empty page. Click + to add content.
              </p>
            )}

            {/* Quick add */}
            <div className="pt-4">
              <button
                onClick={() => handleAddBlock("paragraph")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add a block</span>
              </button>
            </div>
          </div>

          {/* Child pages */}
          {childPages.length > 0 && (
            <div className="mt-10 pl-10">
              <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
                Sub-pages
              </p>
              <div className="space-y-1">
                {childPages.map((child) => (
                  <EditableBlock
                    key={child.id}
                    node={child}
                    pageId={pageId}
                    onMutate={refresh}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Editable page title ──────────────────────────────────────────────────────

function PageTitle({
  pageId,
  icon,
  title,
  onMutate,
}: {
  pageId: string;
  icon: string;
  title: string;
  onMutate: () => void;
}) {
  const [editingIcon, setEditingIcon] = useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const [, startTransition] = useTransition();

  const handleTitleInput = useCallback(
    (e: React.FormEvent<HTMLHeadingElement>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const newTitle = (e.target as HTMLElement).textContent ?? "";
        await adminFetch(`/api/blocks/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            props: { title: newTitle, icon },
          }),
        });
        startTransition(() => onMutate());
      }, 400);
    },
    [pageId, icon, onMutate],
  );

  const handleIconChange = useCallback(
    async (newIcon: string) => {
      setEditingIcon(false);
      await adminFetch(`/api/blocks/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          props: { title, icon: newIcon },
        }),
      });
      startTransition(() => onMutate());
    },
    [pageId, title, onMutate],
  );

  return (
    <div className="flex items-start gap-3">
      {/* Icon (click to edit) */}
      <div className="relative">
        <button
          onClick={() => setEditingIcon(!editingIcon)}
          className="text-5xl hover:bg-accent/50 rounded p-1 transition-colors"
          title="Change icon"
        >
          {icon || "📄"}
        </button>
        {editingIcon && (
          <div className="absolute top-16 left-0 z-50 bg-popover border rounded-lg shadow-lg p-3 w-64">
            <p className="text-xs text-muted-foreground mb-2">
              Type an emoji and press Enter
            </p>
            <input
              autoFocus
              className="w-full border rounded px-2 py-1 text-lg"
              defaultValue={icon}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleIconChange((e.target as HTMLInputElement).value);
                }
                if (e.key === "Escape") setEditingIcon(false);
              }}
              onBlur={(e) => handleIconChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Title */}
      <h1
        contentEditable
        suppressContentEditableWarning
        onInput={handleTitleInput}
        className="text-4xl font-bold tracking-tight outline-none flex-1 focus:ring-2 focus:ring-ring/20 rounded px-1 -mx-1"
      >
        {title}
      </h1>
    </div>
  );
}
