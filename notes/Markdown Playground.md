---
tags: [Markdown, Demo]
---

# Markdown Playground

This note demonstrates the Markdown elements supported by MyNote's editor and preview.

![MyNote logo](/mynote-logo.png)

## Text formatting

Write with **bold text**, *italic text*, ~~strikethrough~~, and `inline code`.

> Markdown keeps formatting readable even when you open the original file in a plain-text editor.

## Lists and tasks

- A simple bullet
- A second bullet with a [link to the Nuxt documentation](https://nuxt.com/docs)
- A nested idea
  - Details can live underneath it

1. Draft the note
2. Preview the result
3. Save and sync

- [x] Create the example note
- [x] Add tags and searchable text
- [ ] Make your own edit

## Table

| Feature | Available |
| --- | :---: |
| Live Markdown preview | ✓ |
| Full-text search | ✓ |
| Tags and filtering | ✓ |
| Git-backed history | ✓ |

## Code block

```ts
interface Note {
  title: string
  tags: string[]
  content: string
}

const note: Note = {
  title: 'Markdown Playground',
  tags: ['Markdown', 'Demo'],
  content: 'Plain files, durable notes.',
}
```

Images pasted or dropped into the editor are saved in a dedicated `.assets` directory beside the note and referenced with a relative Markdown path.

