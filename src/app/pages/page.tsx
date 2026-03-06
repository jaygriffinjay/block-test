/**
 * /pages — redirects to the workspace root page
 */

import { redirect } from "next/navigation";
import { seedWorkspace, WORKSPACE_ID } from "@/lib/blocks/seed";

export default function PagesIndex() {
  seedWorkspace();
  redirect(`/pages/${WORKSPACE_ID}`);
}
