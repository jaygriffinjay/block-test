/**
 * Admin Comment Queue — Server Component
 *
 * Fetches pending comments server-side, passes to the client celebration machine.
 */

import { getPendingComments, getBlock } from "@/lib/blocks/db";
import { H1, Paragraph, Link } from "@/components/typography";
import { ModeToggle } from "@/components/mode-toggle";
import { AdminCommentQueue } from "./admin-queue";

export default function AdminCommentsPage() {
  const pending = getPendingComments();

  // Enrich with parent page info
  const enriched = pending.map((comment) => {
    const parent = comment.parent_id ? getBlock(comment.parent_id) : null;
    const pageTitle =
      parent && parent.type === "page"
        ? ((parent.props as Record<string, unknown>).title as string) ?? parent.id
        : comment.parent_id ?? "unknown";
    return { comment, pageTitle, pageId: comment.parent_id ?? "" };
  });

  return (
    <div className="bg-background min-h-screen">
      <header className="border-border/30 flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/examples"
            className="text-muted-foreground hover:text-foreground text-sm no-underline transition-colors"
          >
            ← Examples
          </Link>
        </div>
        <ModeToggle />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <H1>Comment Queue</H1>
        <Paragraph className="text-muted-foreground">
          Approve or reject pending comments. This is your kingdom.
        </Paragraph>

        <AdminCommentQueue
          pendingComments={enriched.map((e) => ({
            ...e.comment,
            _pageTitle: e.pageTitle,
            _pageId: e.pageId,
          }))}
        />
      </main>
    </div>
  );
}
