"use client";

/**
 * BlockTheme
 *
 * Provides per-block-type className overrides via React context.
 * Wrap any section of your page with <BlockTheme overrides={…}> and every
 * BlockRenderer inside will merge in the extra classes.
 *
 * Usage:
 *   <BlockTheme overrides={{ h1: "text-4xl text-blue-600", paragraph: "text-lg leading-relaxed" }}>
 *     <BlockRenderer node={tree} />
 *   </BlockTheme>
 *
 * Themes nest — inner overrides merge with (and win over) outer ones.
 */

import React, { createContext, useContext, useMemo } from "react";
import type { BlockNode } from "@/lib/blocks/types";

/** Maps block type → extra Tailwind classes */
export type BlockThemeOverrides = Partial<Record<BlockNode["type"], string>>;

interface BlockThemeContextValue {
  overrides: BlockThemeOverrides;
}

const BlockThemeContext = createContext<BlockThemeContextValue>({
  overrides: {},
});

export function useBlockTheme() {
  return useContext(BlockThemeContext);
}

interface BlockThemeProps {
  overrides: BlockThemeOverrides;
  children: React.ReactNode;
}

export function BlockTheme({ overrides, children }: BlockThemeProps) {
  const parent = useBlockTheme();

  // Merge parent overrides with this level (child wins)
  const merged = useMemo<BlockThemeOverrides>(() => {
    const result = { ...parent.overrides };
    for (const [key, value] of Object.entries(overrides)) {
      const existing = result[key as BlockNode["type"]];
      result[key as BlockNode["type"]] = existing
        ? `${existing} ${value}`
        : value;
    }
    return result;
  }, [parent.overrides, overrides]);

  return (
    <BlockThemeContext.Provider value={{ overrides: merged }}>
      {children}
    </BlockThemeContext.Provider>
  );
}
