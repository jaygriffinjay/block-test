import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  H1,
  H2,
  H3,
  Paragraph,
  Bold,
  InlineCode,
  Blockquote,
  List,
  ListItem,
} from "@/components/typography";

export default function BlockSystemPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-16 px-6 py-16">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge>Architecture</Badge>
          <Badge variant="secondary">SQLite</Badge>
          <Badge variant="secondary">React</Badge>
          <Badge variant="outline">In Progress</Badge>
        </div>
        <H1>Block System</H1>
        <Paragraph className="text-muted-foreground text-lg">
          A rendering pipeline where every piece of UI is a typed JSON record in
          SQLite — queryable, composable, and AI-writable without touching
          source code.
        </Paragraph>
      </section>

      <Separator />

      {/* ── The Problem ────────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>The Problem</H2>
        <Paragraph>
          Managing 70+ blog posts as <InlineCode>.mdx</InlineCode> and{" "}
          <InlineCode>.tsx</InlineCode> files breaks down fast. Adding a feature
          like "related posts" meant asking an AI to regex through every file's
          frontmatter, infer relationships, and write back metadata without
          breaking the YAML syntax — all manual, all brittle.
        </Paragraph>
        <Paragraph>
          The root cause:{" "}
          <Bold>
            content is stored in a format designed for humans reading in an
            editor, not for programs reasoning about structure.
          </Bold>{" "}
          Files have no schema. Frontmatter is a config language bolted onto the
          top of another format. Querying requires reading every file.
        </Paragraph>
        <Blockquote>
          AI agents are grepping and sedding through JSX looking for structure
          that was never meant to be machine-readable in the first place.
        </Blockquote>
      </section>

      <Separator />

      {/* ── The Insight ────────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>The Insight</H2>
        <Paragraph>
          A content page with no custom logic — just component tags, props, and
          text — <Bold>is already data</Bold>. It's just stored in a terrible
          format (JSX) that makes it look like code.
        </Paragraph>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Code</CardTitle>
              <CardDescription>Belongs in the repo</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1 text-sm">
              <p>Components and their logic</p>
              <p>API routes and data fetching</p>
              <p>Hooks, state, auth</p>
              <p>The renderer itself</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
              <CardDescription>Belongs in the DB</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-1 text-sm">
              <p>Page trees (what renders)</p>
              <p>Props and text values</p>
              <p>Layout and structure</p>
              <p>Metadata and relationships</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="space-y-6">
        <H2>How It Works</H2>
        <Tabs defaultValue="schema">
          <TabsList>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="render">Render</TabsTrigger>
            <TabsTrigger value="write">Write</TabsTrigger>
          </TabsList>

          <TabsContent value="schema" className="space-y-3 pt-2">
            <Paragraph>
              Every block is a single row. The entire UI lives in one flat
              table.
            </Paragraph>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">{`CREATE TABLE blocks (
  id         TEXT PRIMARY KEY,   -- UUID v4
  type       TEXT NOT NULL,      -- "h2" | "card" | "button" | ...
  props      TEXT DEFAULT '{}',  -- JSON: variant, href, className...
  content    TEXT DEFAULT '[]',  -- JSON: ordered array of child IDs
  parent_id  TEXT,               -- NULL for page roots
  position   INTEGER DEFAULT 0,  -- order among siblings
  created_at INTEGER,
  updated_at INTEGER
)`}</pre>
          </TabsContent>

          <TabsContent value="query" className="space-y-3 pt-2">
            <Paragraph>
              A single recursive CTE fetches an entire page tree in one query.
              No joins, no ORM, no round trips.
            </Paragraph>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">{`WITH RECURSIVE tree AS (
  SELECT * FROM blocks WHERE id = ?
  UNION ALL
  SELECT b.* FROM blocks b
  INNER JOIN tree t ON b.parent_id = t.id
)
SELECT * FROM tree ORDER BY position`}</pre>
            <Paragraph className="text-muted-foreground text-sm">
              The flat result gets reassembled into a tree in memory via{" "}
              <InlineCode>buildTree()</InlineCode> before rendering.
            </Paragraph>
          </TabsContent>

          <TabsContent value="render" className="space-y-3 pt-2">
            <Paragraph>
              <InlineCode>BlockRenderer</InlineCode> is a pure recursive
              function — a switch on <InlineCode>node.type</InlineCode> that
              maps to a React component. ~170 types covered, all shadcn/ui
              components included.
            </Paragraph>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">{`// Conceptually:
switch (node.type) {
  case "h2":     return <H2><Children /></H2>
  case "card":   return <Card><Children /></Card>
  case "button": return <Button {...props}><Children /></Button>
  // ...170 cases
}`}</pre>
          </TabsContent>

          <TabsContent value="write" className="space-y-3 pt-2">
            <Paragraph>
              The primary write path is wholesale — AI generates a complete
              block tree and <InlineCode>replacePageBlocks()</InlineCode> swaps
              it atomically. No surgical edits, no regex, no file I/O.
            </Paragraph>
            <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm">{`// AI generates this → POST /api/blocks
{
  pageId: "...",
  blocks: [
    { id: "...", type: "page", content: ["h1-id", "p-id"] },
    { id: "h1-id", type: "h1", content: ["t1-id"] },
    { id: "t1-id", type: "text", props: { text: "Hello" } },
    ...
  ]
}`}</pre>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* ── Use Cases ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>Use Cases</H2>
        <Accordion type="multiple">
          <AccordionItem value="blog">
            <AccordionTrigger>Blog & content management</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2">
              <p>
                Related posts are just a query — no frontmatter arrays to
                maintain manually. Tags, categories, and cross-references are
                rows, not strings to regex through. Global changes (update every
                CTA button variant across 70 posts) are a single SQL UPDATE.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="rag">
            <AccordionTrigger>RAG / knowledge base chunking</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2">
              <p>
                Chunk boundaries are already in the data — query headings and
                their subtrees directly. No sliding windows, no overlap
                heuristics, no markdown regex. Structure <em>is</em> the
                chunker.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="scraping">
            <AccordionTrigger>Web scraping & news analysis</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2">
              <p>
                HTML → blocks on ingest. Then query only H1/H2s across 500
                scraped pages — 10k tokens instead of 2M — feed those headings
                to an LLM for theme clustering, write the summary output back as
                blocks, render as a human-readable page. Blocks appear at both
                ends of the pipeline.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="design">
            <AccordionTrigger>Design system audit</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2">
              <p>
                Every button variant, every shadow, every font size in use
                across your entire site is a SQL query away. Render a live
                inventory page directly from the query results — no Storybook to
                maintain separately, no AST parsing.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="ai-design">
            <AccordionTrigger>AI component designer</AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2">
              <p>
                LLM outputs a block tree (JSON array), not JSX. The output space
                is exactly BlockType × valid props — enumerable, validatable,
                retryable on failure. No syntax errors, no import management, no
                linter. The renderer handles everything downstream.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Separator />

      {/* ── Honest Pushback ────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>Honest Pushback</H2>
        <Alert>
          <AlertTitle>Authoring is harder</AlertTitle>
          <AlertDescription>
            Raw block JSON is unreadable to humans. Writing content directly as
            block records is miserable. This requires either a visual editor, a
            markdown→blocks converter, or accepting that AI is the primary
            author. This page itself was written as TSX for exactly that reason.
          </AlertDescription>
        </Alert>
        <Alert variant="default">
          <AlertTitle>LLMs know JSX better than block schemas</AlertTitle>
          <AlertDescription>
            For one-shot page generation, a capable model writing TSX is equally
            good or slightly better — it has far more training data on JSX than
            on custom block schemas. The block model wins on everything that
            happens <em>after</em> generation: iteration, querying, mutation,
            cross-page operations.
          </AlertDescription>
        </Alert>
        <Alert variant="default">
          <AlertTitle>Complexity has a cost</AlertTitle>
          <AlertDescription>
            For a personal blog where you write posts and rarely touch them
            again, this is significant infrastructure for marginal gain. The
            payoff is real but only at scale — when you need to query, compose,
            or manipulate content programmatically and repeatedly.
          </AlertDescription>
        </Alert>
      </section>

      <Separator />

      {/* ── vs. Alternatives ───────────────────────────────────── */}
      <section className="space-y-4">
        <H2>vs. Alternatives</H2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium">Approach</th>
                <th className="py-2 pr-4 font-medium">Structure preserved</th>
                <th className="py-2 pr-4 font-medium">Queryable</th>
                <th className="py-2 pr-4 font-medium">Renderable</th>
                <th className="py-2 font-medium">Mutable</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["Raw HTML blob", "✅", "❌", "❌", "❌"],
                ["Plaintext + metadata", "❌", "partial", "❌", "❌"],
                ["Markdown string", "partial", "regex only", "❌", "❌"],
                ["RAG / vector store", "❌", "semantic only", "❌", "❌"],
                ["Strapi dynamic zones", "partial", "partial", "❌", "partial"],
                ["Blocks (this)", "✅", "✅", "✅", "✅"],
              ].map(([label, ...rest]) => (
                <tr key={label} className="border-b last:border-0">
                  <td className="text-foreground py-2 pr-4 font-medium">
                    {label}
                  </td>
                  {rest.map((v, i) => (
                    <td key={i} className="py-2 pr-4">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Separator />

      {/* ── Roadmap ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>Roadmap</H2>
        <div className="grid gap-3">
          {[
            {
              phase: "Now",
              variant: "default" as const,
              items: [
                "Block schema + SQLite (done)",
                "BlockRenderer with all shadcn types (done)",
                "replacePageBlocks write path (done)",
                "REST API (done)",
              ],
            },
            {
              phase: "Next",
              variant: "secondary" as const,
              items: [
                "HTML/markdown → blocks converter (for ingest + migration)",
                "TSX → blocks converter (for existing blog posts)",
                "Entity extraction + block_entities table",
                "Typed props schema per block type",
              ],
            },
            {
              phase: "Later",
              variant: "outline" as const,
              items: [
                "Visual editor with slash commands",
                "Embedding column for RAG integration",
                "Cross-page query examples + demo",
                "AI component designer demo (structured output → blocks)",
              ],
            },
          ].map(({ phase, variant, items }) => (
            <Card key={phase}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant={variant}>{phase}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <List className="text-muted-foreground list-none space-y-1 pl-0 text-sm">
                  {items.map((item) => (
                    <ListItem
                      key={item}
                      className="flex gap-2 marker:content-none"
                    >
                      <span className="text-muted-foreground/50">—</span>
                      {item}
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Core Principle ─────────────────────────────────────── */}
      <section className="space-y-4">
        <H2>Core Principle</H2>
        <Blockquote>
          Source code owns the renderer — fixed, versioned, typed. Data owns the
          content — dynamic, queryable, AI-writable. Storing content as source
          code is an accident of how the web was built, not a requirement.
        </Blockquote>
        <Paragraph className="text-muted-foreground">
          The block DB is not a CMS feature or a collaboration tool. It's the
          correct storage format for anything that is{" "}
          <Bold>
            structured, renderable, and meant to be manipulated programmatically
          </Bold>{" "}
          — whether that's a blog post, a scraped news article, an AI-generated
          dashboard, or a personal knowledge base.
        </Paragraph>
      </section>
    </main>
  );
}
