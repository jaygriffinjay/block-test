"use client";

/**
 * Breadcrumbs — shows ancestor pages from root → current page.
 */

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BlockProps } from "@/lib/blocks/types";

export interface BreadcrumbItem {
  id: string;
  props: BlockProps;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
      {items.map((item, i) => {
        const icon = (item.props.icon as string) || "";
        const title = (item.props.title as string) || "Untitled";
        const isLast = i === items.length - 1;

        return (
          <React.Fragment key={item.id}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {icon && <span className="mr-1">{icon}</span>}
                {title}
              </span>
            ) : (
              <Link
                href={`/pages/${item.id}`}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {icon && <span className="mr-1">{icon}</span>}
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
