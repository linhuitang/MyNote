import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { NoteDocument, NoteSummary } from '~~/shared/types/note'
import { tagsFromMarkdown } from '~~/shared/utils/markdown-metadata'

let mutationQueue: Promise<void> = Promise.resolve()

export function getNotesRoot(): string {
  const configuredPath = useRuntimeConfig().notesDirectory
  return resolve(process.cwd(), configuredPath)
}

export function normaliseNotePath(input: string): string {
  const decoded = decodeURIComponent(input).replaceAll('\\', '/')
  const cleanPath = decoded.replace(/^\/+/, '').replace(/\/+/g, '/')

  if (!cleanPath || cleanPath.startsWith('../') || cleanPath.includes('/../') || extname(cleanPath) !== '.md') {
    throw createError({ statusCode: 400, statusMessage: '笔记路径无效' })
  }

  return cleanPath
}

export function resolveNotePath(notePath: string): string {
  const root = getNotesRoot()
  const target = resolve(root, notePath)

  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw createError({ statusCode: 400, statusMessage: '笔记路径超出允许范围' })
  }

  return target
}

export function revisionFor(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function titleFor(path: string, content: string): string {
  const heading = content.match(/^\s*#\s+(.+)$/m)?.[1]?.trim()
  return heading || basename(path, '.md')
}

function excerptFor(content: string): string {
  return content
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_`~\-[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96)
}

async function findMarkdownFiles(directory: string, root: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    if (entry.name.startsWith('.')) return []

    const absolutePath = resolve(directory, entry.name)
    if (entry.isDirectory()) return findMarkdownFiles(absolutePath, root)
    if (entry.isFile() && extname(entry.name) === '.md') return [relative(root, absolutePath).split(sep).join('/')]
    return []
  }))

  return files.flat()
}

export async function listNotes(searchQuery = ''): Promise<NoteSummary[]> {
  const root = getNotesRoot()
  await mkdir(root, { recursive: true })
  const paths = await findMarkdownFiles(root, root)
  const normalisedQuery = searchQuery.trim().toLocaleLowerCase()

  const notes = await Promise.all(paths.map(async (path) => {
    const absolutePath = resolveNotePath(path)
    const [content, fileStat] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ])

    const title = titleFor(path, content)
    if (normalisedQuery && !`${title}\n${path}\n${content}`.toLocaleLowerCase().includes(normalisedQuery)) {
      return null
    }

    return {
      path,
      title,
      excerpt: excerptFor(content),
      tags: tagsFromMarkdown(content),
      updatedAt: fileStat.mtime.toISOString(),
      revision: revisionFor(content),
    }
  }))

  return notes
    .filter((note): note is NoteSummary => note !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function readNote(pathInput: string): Promise<NoteDocument> {
  const path = normaliseNotePath(pathInput)
  const absolutePath = resolveNotePath(path)

  try {
    const [content, fileStat] = await Promise.all([
      readFile(absolutePath, 'utf8'),
      stat(absolutePath),
    ])

    return {
      path,
      title: titleFor(path, content),
      excerpt: excerptFor(content),
      tags: tagsFromMarkdown(content),
      updatedAt: fileStat.mtime.toISOString(),
      revision: revisionFor(content),
      content,
    }
  }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: '笔记不存在' })
    }
    throw error
  }
}

export async function noteExists(pathInput: string): Promise<boolean> {
  const path = normaliseNotePath(pathInput)
  try {
    return (await stat(resolveNotePath(path))).isFile()
  }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

export async function saveNote(
  pathInput: string,
  content: string,
  expectedRevision: string | null,
  prepareContent?: (path: string, content: string) => Promise<string>,
): Promise<NoteDocument> {
  const path = normaliseNotePath(pathInput)
  const absolutePath = resolveNotePath(path)

  const operation = mutationQueue.then(async () => {
    let currentContent: string | null = null
    try {
      currentContent = await readFile(absolutePath, 'utf8')
    }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }

    const currentRevision = currentContent === null ? null : revisionFor(currentContent)
    if (currentRevision !== expectedRevision) {
      throw createError({
        statusCode: 409,
        statusMessage: '笔记已被其他程序修改',
        data: { currentRevision },
      })
    }

    const contentToSave = prepareContent ? await prepareContent(path, content) : content
    await mkdir(dirname(absolutePath), { recursive: true })
    const temporaryPath = resolve(dirname(absolutePath), `.${basename(absolutePath)}.${randomUUID()}.tmp`)
    await writeFile(temporaryPath, contentToSave, 'utf8')
    await rename(temporaryPath, absolutePath)
  })

  mutationQueue = operation.catch(() => undefined)
  await operation
  return readNote(path)
}

export async function deleteNote(
  pathInput: string,
  expectedRevision: string,
  deleteAssociatedFiles?: (path: string) => Promise<void>,
): Promise<string> {
  const path = normaliseNotePath(pathInput)
  const absolutePath = resolveNotePath(path)

  const operation = mutationQueue.then(async () => {
    let currentContent: string
    try {
      currentContent = await readFile(absolutePath, 'utf8')
    }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createError({ statusCode: 404, statusMessage: '笔记不存在或已经被删除' })
      }
      throw error
    }

    if (revisionFor(currentContent) !== expectedRevision) {
      throw createError({
        statusCode: 409,
        statusMessage: '笔记已被其他程序修改，请重新载入后再删除',
      })
    }

    if (deleteAssociatedFiles) await deleteAssociatedFiles(path)
    await unlink(absolutePath)
  })

  mutationQueue = operation.catch(() => undefined)
  await operation
  return path
}
