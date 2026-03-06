# Experiments

Scratch space for testing new block types before promoting them to real pages.

---

Try writing some markdown and importing it:

```bash
npx tsx scripts/import.ts content/my-file.md --title "My Page"
```

The importer will parse the markdown, create block records for every heading, paragraph, list, and inline mark, then write them all to SQLite in one transaction.
