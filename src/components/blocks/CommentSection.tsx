/**
 * CommentSection
 *
 * Drop-in comment section for any page. Combines CommentForm + CommentList
 * with auto-refresh after posting.
 *
 * Usage:
 *   <CommentSection pageId="some-page-id" />
 */

"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";

interface CommentSectionProps {
  pageId: string;
  /** Show delete buttons on comments */
  allowDelete?: boolean;
  className?: string;
}

export function CommentSection({
  pageId,
  allowDelete = false,
  className,
}: CommentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNewComment = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDelete = useCallback(() => {
    // CommentList handles optimistic deletion — just bump the key for consistency
  }, []);

  return (
    <section className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Comments</h3>
        <p className="text-muted-foreground text-sm">
          Share your thoughts — no account needed.
        </p>
      </div>

      <CommentForm pageId={pageId} onSubmit={handleNewComment} />

      <CommentList
        pageId={pageId}
        refreshKey={refreshKey}
        onDelete={allowDelete ? handleDelete : undefined}
      />
    </section>
  );
}
