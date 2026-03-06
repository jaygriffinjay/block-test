"use client";

/**
 * EditableBlock — wraps BlockRenderer with inline editing.
 *
 * - Text/heading/paragraph blocks are contentEditable — changes PATCH the API
 * - Each block gets a hover toolbar with: add block below, delete, turn into page
 * - Page blocks render as links to the sub-page
 */

import React, { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical, FileText } from "lucide-react";
import { nanoid } from "nanoid";
import type { BlockNode, BlockType } from "@/lib/blocks/types";
import { adminFetch } from "@/lib/admin-fetch";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableBlockProps {
  node: BlockNode;
  pageId: string;
  /** Called after any mutation so the parent can refresh data */
  onMutate: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function patchBlock(id: string, patch: Record<string, unknown>) {
  await adminFetch(`/api/blocks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

async function createBlock(block: Record<string, unknown>) {
  await adminFetch("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ block }),
  });
}

async function removeBlock(id: string) {
  await adminFetch(`/api/blocks/${id}`, { method: "DELETE" });
}

// Block types you can create from the "+" menu
const INSERTABLE_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: "paragraph", label: "Text", icon: "¶" },
  { type: "h1", label: "Heading 1", icon: "H1" },
  { type: "h2", label: "Heading 2", icon: "H2" },
  { type: "h3", label: "Heading 3", icon: "H3" },
  { type: "blockquote", label: "Quote", icon: "❝" },
  { type: "divider", label: "Divider", icon: "—" },
  { type: "list", label: "Bullet list", icon: "•" },
  { type: "page", label: "Sub-page", icon: "📄" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function EditableBlock({ node, pageId, onMutate }: EditableBlockProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showMenu, setShowMenu] = useState(false);

  const handleAddBlock = useCallback(
    async (type: BlockType) => {
      setShowMenu(false);
      const newId = nanoid();

      if (type === "page") {
        // Create a sub-page
        await createBlock({
          id: newId,
          type: "page",
          props: { title: "Untitled", icon: "📄" },
          content: [],
          parent_id: pageId,
          position: node.position + 1,
        });
      } else if (type === "list") {
        // List with one item
        const itemId = nanoid();
        const textId = nanoid();
        await createBlock({
          id: textId,
          type: "text",
          props: { text: "" },
          content: [],
          parent_id: itemId,
          position: 0,
        });
        await createBlock({
          id: itemId,
          type: "list_item",
          props: {},
          content: [textId],
          parent_id: newId,
          position: 0,
        });
        await createBlock({
          id: newId,
          type: "list",
          props: { ordered: false },
          content: [itemId],
          parent_id: pageId,
          position: node.position + 1,
        });
      } else {
        // Block-level element with a text child
        const textId = nanoid();
        await createBlock({
          id: textId,
          type: "text",
          props: { text: "" },
          content: [],
          parent_id: newId,
          position: 0,
        });
        await createBlock({
          id: newId,
          type,
          props: {},
          content: [textId],
          parent_id: pageId,
          position: node.position + 1,
        });
      }

      startTransition(() => {
        onMutate();
      });
    },
    [pageId, node.position, onMutate],
  );

  const handleDelete = useCallback(async () => {
    await removeBlock(node.id);
    startTransition(() => {
      onMutate();
    });
  }, [node.id, onMutate]);

  // Sub-page blocks render as clickable links, not editable content
  if (node.type === "page") {
    const icon = (node.props.icon as string) || "";
    const title = (node.props.title as string) || "Untitled";
    return (
      <div className="group relative">
        <Link
          href={`/pages/${node.id}`}
          className="flex items-center gap-2 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
        >
          <span className="text-lg">{icon || "📄"}</span>
          <span className="font-medium">{title}</span>
        </Link>
        <BlockActions
          onDelete={handleDelete}
          onAdd={() => setShowMenu(!showMenu)}
          showMenu={showMenu}
          onSelectType={handleAddBlock}
          onCloseMenu={() => setShowMenu(false)}
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <EditableContent node={node} onMutate={onMutate} />
      <BlockActions
        onDelete={handleDelete}
        onAdd={() => setShowMenu(!showMenu)}
        showMenu={showMenu}
        onSelectType={handleAddBlock}
        onCloseMenu={() => setShowMenu(false)}
      />
    </div>
  );
}

// ─── Editable content (contentEditable for text) ──────────────────────────────

function EditableContent({
  node,
  onMutate,
}: {
  node: BlockNode;
  onMutate: () => void;
}) {
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Find all text leaf nodes in the subtree for editing
  const isEditableLeaf =
    node.type === "text" ||
    (["h1", "h2", "h3", "h4", "h5", "h6", "paragraph", "blockquote"].includes(
      node.type,
    ) &&
      node.children.length > 0);

  const handleInput = useCallback(() => {
    if (!ref.current) return;

    // Debounce saves
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const text = ref.current?.textContent ?? "";

      // If this is a container (h1, paragraph), update the first text child
      if (node.children.length > 0) {
        const textChild = findFirstTextNode(node);
        if (textChild) {
          await patchBlock(textChild.id, { props: { text } });
        }
      } else if (node.type === "text") {
        await patchBlock(node.id, { props: { text } });
      }
    }, 400);
  }, [node]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Prevent newlines in single-line blocks (headings)
        if (
          ["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.type)
        ) {
          e.preventDefault();
        }
      }
    },
    [node.type],
  );

  if (!isEditableLeaf) {
    // For non-editable blocks (divider, list, etc.), render children recursively
    return <NonEditableBlock node={node} onMutate={onMutate} />;
  }

  // Get the text content to display
  const text = getTextContent(node);

  // Map block type to HTML element tag name
  const tagName = getTagForType(node.type);

  return React.createElement(tagName, {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    className: cn(
      "outline-none focus:ring-2 focus:ring-ring/20 rounded px-1 -mx-1 transition-shadow",
      getClassForType(node.type),
    ),
    "data-placeholder": getPlaceholder(node.type),
    children: text,
  });
}

// ─── Non-editable block (divider, list, etc.) ─────────────────────────────────

function NonEditableBlock({
  node,
  onMutate,
}: {
  node: BlockNode;
  onMutate: () => void;
}) {
  if (node.type === "divider") {
    return <hr className="my-6 border-border" />;
  }

  if (node.type === "list") {
    const ordered = (node.props as Record<string, unknown>).ordered as boolean;
    const Tag = ordered ? "ol" : "ul";
    return (
      <Tag
        className={cn(
          "pl-6 space-y-1",
          ordered ? "list-decimal" : "list-disc",
        )}
      >
        {node.children.map((child) => (
          <EditableContent key={child.id} node={child} onMutate={onMutate} />
        ))}
      </Tag>
    );
  }

  if (node.type === "list_item") {
    return (
      <li>
        {node.children.map((child) => (
          <EditableContent key={child.id} node={child} onMutate={onMutate} />
        ))}
      </li>
    );
  }

  // Fallback: render children
  return (
    <div>
      {node.children.map((child) => (
        <EditableContent key={child.id} node={child} onMutate={onMutate} />
      ))}
    </div>
  );
}

// ─── Block action buttons (hover toolbar) ─────────────────────────────────────

function BlockActions({
  onDelete,
  onAdd,
  showMenu,
  onSelectType,
  onCloseMenu,
}: {
  onDelete: () => void;
  onAdd: () => void;
  showMenu: boolean;
  onSelectType: (type: BlockType) => void;
  onCloseMenu: () => void;
}) {
  return (
    <>
      {/* Left-side controls */}
      <div className="absolute -left-10 top-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAdd}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Add block"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          className="p-1 rounded hover:bg-accent text-muted-foreground cursor-grab transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Right-side delete */}
      <div className="absolute -right-8 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Insert menu */}
      {showMenu && (
        <div className="absolute -left-10 top-8 z-50 w-48 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-top-1">
          {INSERTABLE_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => {
                onSelectType(type);
                onCloseMenu();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <span className="w-5 text-center text-xs">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function findFirstTextNode(node: BlockNode): BlockNode | null {
  if (node.type === "text") return node;
  for (const child of node.children) {
    const found = findFirstTextNode(child);
    if (found) return found;
  }
  return null;
}

function getTextContent(node: BlockNode): string {
  if (node.type === "text") {
    return (node.props.text as string) ?? "";
  }
  return node.children.map(getTextContent).join("");
}

function getTagForType(type: string) {
  switch (type) {
    case "h1":
      return "h1" as const;
    case "h2":
      return "h2" as const;
    case "h3":
      return "h3" as const;
    case "h4":
      return "h4" as const;
    case "h5":
      return "h5" as const;
    case "h6":
      return "h6" as const;
    case "paragraph":
    case "text":
      return "p" as const;
    case "blockquote":
      return "blockquote" as const;
    default:
      return "div" as const;
  }
}

function getClassForType(type: string): string {
  switch (type) {
    case "h1":
      return "text-5xl font-bold tracking-tight";
    case "h2":
      return "text-3xl font-semibold tracking-tight";
    case "h3":
      return "text-2xl font-semibold tracking-tight";
    case "h4":
      return "text-xl font-semibold tracking-tight";
    case "h5":
      return "text-lg font-semibold";
    case "h6":
      return "text-base font-semibold";
    case "paragraph":
    case "text":
      return "text-base leading-7";
    case "blockquote":
      return "border-l-4 border-border pl-4 italic text-muted-foreground";
    default:
      return "";
  }
}

function getPlaceholder(type: string): string {
  switch (type) {
    case "h1":
      return "Heading 1";
    case "h2":
      return "Heading 2";
    case "h3":
      return "Heading 3";
    default:
      return "Type something…";
  }
}
