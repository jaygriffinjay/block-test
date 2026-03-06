/**
 * Client wrapper for the comment demo.
 * Separated because CommentSection is a client component ("use client")
 * and the page is a server component.
 */

"use client";

import { CommentSection } from "@/components/blocks/CommentSection";

interface CommentDemoProps {
  pageId: string;
}

export function CommentDemo({ pageId }: CommentDemoProps) {
  return (
    <CommentSection
      pageId={pageId}
      allowDelete
      className="mt-4"
    />
  );
}
