/**
 * CommentList
 *
 * Renders a list of comment blocks with name, timestamp, and text.
 * Can be used server-side (pass comments as props) or client-side (fetches from API).
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/blocks/types";

// ─── Single Comment ───────────────────────────────────────────────────────────

interface CommentCardProps {
  comment: Block;
  onDelete?: (id: string) => void;
}

function CommentCard({ comment, onDelete }: CommentCardProps) {
  const p = comment.props as Record<string, unknown>;
  const name = (p.name as string) || "Anonymous";
  const text = (p.text as string) || "";
  const timestamp = p.timestamp as string | undefined;

  const timeAgo = timestamp ? formatRelativeTime(timestamp) : null;

  return (
    <div className="border-border group border-b py-4 last:border-b-0">
      <div className="mb-1 flex items-center gap-2">
        {/* Avatar circle with first letter */}
        <div className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
          {name[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="text-sm font-medium">{name}</span>
        {timeAgo && (
          <span className="text-muted-foreground text-xs" title={timestamp}>
            · {timeAgo}
          </span>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-muted-foreground hover:text-destructive ml-auto text-xs opacity-0 transition-opacity group-hover:opacity-100"
          >
            Delete
          </button>
        )}
      </div>
      <p className="text-foreground pl-9 text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ─── Comment List ─────────────────────────────────────────────────────────────

interface CommentListProps {
  /** Page ID — if provided, fetches comments from the API */
  pageId?: string;
  /** Pre-fetched comments — if provided, skips API fetch */
  comments?: Block[];
  /** Called when a comment is deleted (for parent state sync) */
  onDelete?: (id: string) => void;
  /** Refresh trigger — increment to refetch */
  refreshKey?: number;
  className?: string;
}

export function CommentList({
  pageId,
  comments: initialComments,
  onDelete,
  refreshKey,
  className,
}: CommentListProps) {
  const [comments, setComments] = useState<Block[]>(initialComments ?? []);
  const [loading, setLoading] = useState(!initialComments && !!pageId);

  const fetchComments = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?page=${pageId}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      // silently fail — comments are non-critical
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  // Fetch on mount (if no initial comments) and on refreshKey change
  useEffect(() => {
    if (!initialComments) fetchComments();
  }, [fetchComments, refreshKey, initialComments]);

  // Also update when initialComments change
  useEffect(() => {
    if (initialComments) setComments(initialComments);
  }, [initialComments]);

  async function handleDelete(id: string) {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      alert("Admin token not set. Go to /admin/comments to set it.");
      return;
    }

    // Optimistic remove
    setComments((prev) => prev.filter((c) => c.id !== id));
    onDelete?.(id);

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Re-fetch to restore correct state
        fetchComments();
      }
    } catch {
      fetchComments();
    }
  }

  if (loading) {
    return (
      <div className={cn("text-muted-foreground py-4 text-center text-sm", className)}>
        Loading comments…
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className={cn("text-muted-foreground py-4 text-center text-sm", className)}>
        No comments yet. Be the first!
      </div>
    );
  }

  return (
    <div className={className}>
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          onDelete={onDelete ? handleDelete : undefined}
        />
      ))}
    </div>
  );
}

// ─── Time Formatting ──────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
