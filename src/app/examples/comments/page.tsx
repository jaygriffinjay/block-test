/**
 * Comment System Demo
 *
 * Shows the CommentSection component attached to a real page from the DB.
 * Comments are stored as blocks — same DB, same API, same everything.
 */

import { seedWorkspace, WORKSPACE_ID } from "@/lib/blocks/seed";
import { listPages } from "@/lib/blocks/db";
import { H1, H2, Paragraph, Link, Small } from "@/components/typography";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import { CommentDemo } from "./comment-demo";

export default function CommentsPage() {
  // Ensure we have pages to attach comments to
  seedWorkspace();
  const pages = listPages();

  // Pick the first content page (not the workspace root)
  const targetPage = pages.find((p) => p.id !== WORKSPACE_ID) ?? pages[0];

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
        <H1>Comment System</H1>
        <Paragraph className="text-muted-foreground">
          Comments are blocks. They live in the same SQLite database, use the
          same API, and can be queried, searched, and deleted with the same
          operations as any other block.
        </Paragraph>

        <Separator className="my-8" />

        <section className="space-y-4">
          <H2>How it works</H2>
          <div className="bg-muted/50 space-y-2 rounded-lg p-4 text-sm">
            <p>
              <strong>Type:</strong>{" "}
              <code className="bg-muted rounded px-1 py-0.5">comment</code>
            </p>
            <p>
              <strong>Props:</strong>{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {"{ name, text, timestamp }"}
              </code>
            </p>
            <p>
              <strong>Parent:</strong> Any page block — comments attach to the
              page they belong to via <code className="bg-muted rounded px-1 py-0.5">parent_id</code>.
            </p>
            <p>
              <strong>API:</strong>{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                GET/POST /api/comments
              </code>{" "}
              — rate-limited, validates input, no auth required.
            </p>
            <p>
              <strong>Delete:</strong> Same{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                DELETE /api/blocks/:id
              </code>{" "}
              endpoint used for any block.
            </p>
          </div>
        </section>

        <Separator className="my-8" />

        <section>
          <H2>Live Demo</H2>
          <Paragraph>
            <Small className="text-muted-foreground">
              Attached to page:{" "}
              <strong>
                {(targetPage?.props as Record<string, unknown>)?.title as string ?? targetPage?.id}
              </strong>
            </Small>
          </Paragraph>

          {targetPage ? (
            <CommentDemo pageId={targetPage.id} />
          ) : (
            <Paragraph className="text-muted-foreground">
              No pages found. Run the seed script first.
            </Paragraph>
          )}
        </section>
      </main>
    </div>
  );
}
