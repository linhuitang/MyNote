---
tags: [Git, Workflow]
---

# Git-Powered Workflow

MyNote uses Git as a transparent version and synchronization layer rather than hiding history inside a database.

## Edit in the browser

When you select **Save and sync**, MyNote:

1. Checks whether another editor changed the file.
2. Writes the Markdown file atomically.
3. Adds the note and its image directory to Git.
4. Creates a commit.
5. Pushes to the configured remote repository.

## Edit with a local editor

You can also change files directly inside `notes/`:

```bash
git add notes
git commit -m "Update notes"
git push origin main
```

A server configured with the included systemd timer will pull the new commit automatically. Note-only changes become available without rebuilding the application container.

## Avoiding conflicts

MyNote stores a revision identifier when it loads a note. If the file changes before you save, the editor warns you instead of silently overwriting the newer version.

For the clearest history, avoid editing the same note in the browser and a local editor at the same time.

