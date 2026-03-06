/**
 * /pages/[id] — dynamic page route
 *
 * Server component that:
 *  1. Seeds workspace if needed
 *  2. Fetches the page's block tree
 *  3. Builds breadcrumbs from ancestors
 *  4. Gets the sidebar page tree
 *  5. Renders via the client PageShell
 */

import { notFound } from "next/navigation";
import {
  getBlock,
  getBlockTree,
  getAncestors,
  getPageTree,
} from "@/lib/blocks/db";
import { buildTree } from "@/lib/blocks/types";
import { seedWorkspace, WORKSPACE_ID } from "@/lib/blocks/seed";
import { PageShell } from "@/components/blocks/PageShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PageRoute({ params }: Props) {
  const { id } = await params;

  // Seed on first visit
  seedWorkspace();

  // Fetch the page block
  const page = getBlock(id);
  if (!page || page.type !== "page") {
    notFound();
  }

  // Build the full block tree for this page
  const flatBlocks = getBlockTree(id);
  const [pageNode] = buildTree(flatBlocks);

  // Breadcrumbs: ancestors from root → this page
  const ancestors = getAncestors(id);
  const breadcrumbs = [
    ...ancestors.map((a) => ({ id: a.id, props: a.props })),
    { id: page.id, props: page.props },
  ];

  // Sidebar: full page tree from workspace root
  const pageTree = getPageTree(WORKSPACE_ID);

  return (
    <PageShell
      pageId={id}
      pageTree={pageTree}
      breadcrumbs={breadcrumbs}
      pageNode={pageNode}
    />
  );
}
