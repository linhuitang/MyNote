import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { relative, resolve, sep } from 'node:path'
import type { NoteChangeType, NoteHistoryChange, NoteHistoryDetail, NoteHistoryEntry } from '~~/shared/types/note'
import { getNotesRoot } from './note-store'

const execFileAsync = promisify(execFile)
const commitMarker = '__MYNOTE_COMMIT__'
const fieldSeparator = '\u001f'

function normalisePath(path: string): string {
  return path.split(sep).join('/')
}

function noteRelativePath(repositoryPath: string, notesRepositoryPath: string): string | null {
  const cleanPath = normalisePath(repositoryPath)
  const prefix = notesRepositoryPath && notesRepositoryPath !== '.' ? `${notesRepositoryPath}/` : ''
  if (prefix && !cleanPath.startsWith(prefix)) return null
  const notePath = prefix ? cleanPath.slice(prefix.length) : cleanPath
  return notePath.endsWith('.md') ? notePath : null
}

function changeType(status: string): NoteChangeType | null {
  if (status.startsWith('A')) return 'added'
  if (status.startsWith('M')) return 'modified'
  if (status.startsWith('D')) return 'deleted'
  if (status.startsWith('R')) return 'renamed'
  return null
}

function parseChange(line: string, notesRepositoryPath: string): NoteHistoryChange | null {
  const parts = line.split('\t')
  const type = changeType(parts[0] || '')
  if (!type) return null

  if (type === 'renamed') {
    const previousPath = noteRelativePath(parts[1] || '', notesRepositoryPath)
    const path = noteRelativePath(parts[2] || '', notesRepositoryPath)
    if (!path) return null
    return { type, path, ...(previousPath ? { previousPath } : {}) }
  }

  const path = noteRelativePath(parts[1] || '', notesRepositoryPath)
  return path ? { type, path } : null
}

async function repositoryContext(): Promise<{ repositoryRoot: string, notesRepositoryPath: string } | null> {
  const notesRoot = getNotesRoot()
  try {
    const repositoryRootResult = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd: notesRoot,
      encoding: 'utf8',
    })
    const repositoryRoot = repositoryRootResult.stdout.trim()
    const notesRepositoryPath = normalisePath(relative(repositoryRoot, resolve(notesRoot))) || '.'
    if (notesRepositoryPath.startsWith('../')) return null
    return { repositoryRoot, notesRepositoryPath }
  }
  catch {
    return null
  }
}

export async function getNoteHistory(): Promise<NoteHistoryEntry[]> {
  try {
    const context = await repositoryContext()
    if (!context) return []
    const { repositoryRoot, notesRepositoryPath } = context

    const format = `${commitMarker}${fieldSeparator}%H${fieldSeparator}%h${fieldSeparator}%an${fieldSeparator}%aI${fieldSeparator}%s`
    const result = await execFileAsync('git', [
      '-c',
      'core.quotePath=false',
      'log',
      '--date=iso-strict',
      `--pretty=format:${format}`,
      '--name-status',
      '--',
      notesRepositoryPath,
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
    })

    return result.stdout
      .split(commitMarker)
      .slice(1)
      .map((block): NoteHistoryEntry | null => {
        const lines = block.trim().split('\n').filter(Boolean)
        const metadata = (lines.shift() || '').split(fieldSeparator)
        const [, hash, shortHash, author, committedAt, subject] = metadata
        if (!hash || !shortHash || !committedAt) return null

        const changes = lines
          .map(line => parseChange(line, notesRepositoryPath))
          .filter((change): change is NoteHistoryChange => change !== null)
        if (!changes.length) return null

        return {
          hash,
          shortHash,
          author: author || 'Unknown',
          committedAt,
          subject: subject || 'Update notes',
          changes,
        }
      })
      .filter((entry): entry is NoteHistoryEntry => entry !== null)
  }
  catch {
    return []
  }
}

export async function getNoteHistoryForNote(notePath: string): Promise<NoteHistoryEntry[]> {
  try {
    const context = await repositoryContext()
    if (!context) return []
    const { repositoryRoot, notesRepositoryPath } = context
    const repositoryNotePath = notesRepositoryPath === '.' ? notePath : `${notesRepositoryPath}/${notePath}`
    const format = `${commitMarker}${fieldSeparator}%H${fieldSeparator}%h${fieldSeparator}%an${fieldSeparator}%aI${fieldSeparator}%s`
    const result = await execFileAsync('git', [
      '-c',
      'core.quotePath=false',
      'log',
      '--follow',
      '--date=iso-strict',
      `--pretty=format:${format}`,
      '--name-status',
      '--',
      repositoryNotePath,
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
    })

    return result.stdout
      .split(commitMarker)
      .slice(1)
      .map((block): NoteHistoryEntry | null => {
        const lines = block.trim().split('\n').filter(Boolean)
        const metadata = (lines.shift() || '').split(fieldSeparator)
        const [, hash, shortHash, author, committedAt, subject] = metadata
        if (!hash || !shortHash || !committedAt) return null

        const changes = lines
          .map(line => parseChange(line, notesRepositoryPath))
          .filter((change): change is NoteHistoryChange => change !== null)
        if (!changes.length) return null

        return {
          hash,
          shortHash,
          author: author || 'Unknown',
          committedAt,
          subject: subject || 'Update note',
          changes,
        }
      })
      .filter((entry): entry is NoteHistoryEntry => entry !== null)
  }
  catch {
    return []
  }
}

export async function getNoteHistoryDetail(commitHash: string): Promise<NoteHistoryDetail | null> {
  if (!/^[0-9a-f]{7,40}$/i.test(commitHash)) return null
  const context = await repositoryContext()
  if (!context) return null
  const { repositoryRoot, notesRepositoryPath } = context
  const commonOptions = { cwd: repositoryRoot, encoding: 'utf8' as const, maxBuffer: 10 * 1024 * 1024 }

  try {
    const [metadataResult, changesResult, patchResult] = await Promise.all([
      execFileAsync('git', [
        'show', '-s', '--date=iso-strict',
        `--format=%H${fieldSeparator}%h${fieldSeparator}%an${fieldSeparator}%aI${fieldSeparator}%s`,
        commitHash,
      ], commonOptions),
      execFileAsync('git', [
        '-c', 'core.quotePath=false', 'diff-tree', '--root', '--no-commit-id', '--name-status', '-r', '-M',
        commitHash, '--', notesRepositoryPath,
      ], commonOptions),
      execFileAsync('git', [
        '-c', 'core.quotePath=false', 'show', '--format=', '--find-renames', '--no-ext-diff', '--unified=5',
        commitHash, '--', notesRepositoryPath,
      ], commonOptions),
    ])

    const [hash, shortHash, author, committedAt, subject] = metadataResult.stdout.trim().split(fieldSeparator)
    if (!hash || !shortHash || !committedAt) return null

    const changes = changesResult.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => parseChange(line, notesRepositoryPath))
      .filter((change): change is NoteHistoryChange => change !== null)
    if (!changes.length) return null

    return {
      hash,
      shortHash,
      author: author || 'Unknown',
      committedAt,
      subject: subject || 'Update notes',
      changes,
      patch: patchResult.stdout.trim(),
    }
  }
  catch {
    return null
  }
}
