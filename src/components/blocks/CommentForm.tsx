/**
 * CommentForm
 *
 * Minimal anonymous comment form — name (optional) + text + submit.
 * Posts to /api/comments, calls onSubmit callback with the new comment.
 */

"use client";

import React, { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  pageId: string;
  onSubmit?: (comment: Record<string, unknown>) => void;
  className?: string;
}

export function CommentForm({ pageId, onSubmit, className }: CommentFormProps) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [charCount, setCharCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    setCharCount(val.length);
    if (submitted) setSubmitted(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId,
            name: name.trim() || undefined,
            text: text.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to post comment.");
          return;
        }

        // Success — clear form and notify parent
        setName("");
        setText("");
        setCharCount(0);
        setSubmitted(true);
        onSubmit?.(data.comment);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-3", className)}
    >
      <div>
        <label
          htmlFor="comment-name"
          className="text-muted-foreground mb-1 block text-sm font-medium"
        >
          Name{" "}
          <span className="text-muted-foreground/60 text-xs">(optional)</span>
        </label>
        <input
          id="comment-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Anonymous"
          maxLength={100}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>

      <div>
        <label
          htmlFor="comment-text"
          className="text-muted-foreground mb-1 block text-sm font-medium"
        >
          Comment
        </label>
        <textarea
          id="comment-text"
          value={text}
          onChange={handleTextChange}
          placeholder="Write a comment…"
          rows={3}
          maxLength={2000}
          required
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
        <div className="text-muted-foreground/60 mt-0.5 text-right text-xs">
          {charCount}/2000
        </div>
      </div>

      {submitted && (
        <p className="text-emerald-600 dark:text-emerald-400 text-sm">
          ✓ Comment submitted! It will appear after review.
        </p>
      )}

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {isPending ? "Posting…" : "Post Comment"}
      </button>
    </form>
  );
}
