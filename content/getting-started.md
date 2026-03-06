# Getting Started

Welcome to the block system. Every piece of content you see — headings, paragraphs, lists — is a row in a SQLite database.

Each page is a **block** whose _content array_ lists the IDs of its children in order. Navigate to a child page and it becomes the new root.

## How it works

1. Write content in markdown
2. The importer parses it into an AST
3. Each AST node becomes a block record in SQLite
4. The renderer walks the block tree and maps each type to a React component

That's it. No MDX transpilation, no build step, no source code generation. Your content is **data**, and your renderer is a pure function.
