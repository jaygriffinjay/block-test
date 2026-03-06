# The Block System

Every unit of content is a block — a flat record in SQLite. The rendering pipeline is three steps: fetch a flat list, `buildTree()`, then `BlockRenderer` recurses.

## Core fields

A block has four things:

- **id** — nanoid, the block's unique key
- **type** — maps directly to a React component
- **props** — arbitrary JSON passed to the component
- **content** — ordered array of child block IDs

## The pipeline

Markdown goes in, blocks come out:

```
markdown string → fromMarkdown() → MDAST → walk tree → flat block records → SQLite
```

One recursive CTE query fetches an entire page tree. `buildTree()` assembles the flat list into a nested tree. `BlockRenderer` switches on `block.type` and renders the matching React component.

> Blocks are the most foundational component of Notion's mission to empower any person or business to tailor software to their problems. — Notion Engineering

## Why not MDX?

MDX mixes markup with JavaScript in a way that's hard to query, version, or transform. Blocks separate **content** from **rendering** — your data is a plain SQLite table, and your UI is a pure function of that data.
