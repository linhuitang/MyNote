import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { relative, resolve } from 'node:path'
import type { GitSyncResult } from '~~/shared/types/note'
import { attachmentDirectoryForNote } from './note-assets'
import { getNotesRoot, resolveNotePath } from './note-store'

const execFileAsync = promisify(execFile)

interface GitCommandError extends Error {
  stderr?: string
  stdout?: string
  code?: number
}

async function git(args: string[], cwd: string): Promise<string> {
  const result = await execFileAsync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  return result.stdout.trim()
}

function errorMessage(error: unknown): string {
  const gitError = error as GitCommandError
  return gitError.stderr?.trim() || gitError.stdout?.trim() || gitError.message || '未知 Git 错误'
}

export async function syncNoteToGit(notePath: string, action: 'update' | 'delete' = 'update'): Promise<GitSyncResult> {
  const notesRoot = getNotesRoot()
  let repositoryRoot: string

  try {
    repositoryRoot = await git(['rev-parse', '--show-toplevel'], notesRoot)
  }
  catch {
    return {
      state: 'unavailable',
      message: '文件已保存，但当前目录还不是 Git 仓库',
    }
  }

  const absoluteNotePath = resolveNotePath(notePath)
  const repositoryPath = relative(repositoryRoot, absoluteNotePath).split('\\').join('/')
  if (repositoryPath.startsWith('../') || resolve(repositoryRoot, repositoryPath) !== absoluteNotePath) {
    return {
      state: 'unavailable',
      message: '文件已保存，但笔记目录不在当前 Git 仓库中',
    }
  }

  try {
    const absoluteAttachmentPath = attachmentDirectoryForNote(notePath)
    const repositoryAttachmentPath = relative(repositoryRoot, absoluteAttachmentPath).split('\\').join('/')
    const attachmentExists = await stat(absoluteAttachmentPath).then(() => true).catch(() => false)
    const trackedAttachments = attachmentExists
      ? ''
      : await git(['ls-files', '--', repositoryAttachmentPath], repositoryRoot)
    const paths = attachmentExists || trackedAttachments
      ? [repositoryPath, repositoryAttachmentPath]
      : [repositoryPath]

    await git(['add', '-A', '--', ...paths], repositoryRoot)

    try {
      await git(['diff', '--cached', '--quiet', '--', ...paths], repositoryRoot)
      return { state: 'unchanged', message: '内容没有变化' }
    }
    catch (error: unknown) {
      if ((error as GitCommandError).code !== 1) throw error
    }

    const commitAction = action === 'delete' ? 'Delete' : 'Update'
    await git(['commit', '-m', `${commitAction} ${repositoryPath}`, '--', ...paths], repositoryRoot)
    const remotes = await git(['remote'], repositoryRoot)
    if (!remotes) {
      return {
        state: 'committed',
        message: '已保存并提交到本地 Git；添加远端仓库后即可推送',
      }
    }

    try {
      await git(['push'], repositoryRoot)
      return { state: 'synced', message: '已保存并同步到远端 Git' }
    }
    catch (error: unknown) {
      return {
        state: 'failed',
        message: `已保存并提交到本地 Git，但推送失败：${errorMessage(error)}`,
      }
    }
  }
  catch (error: unknown) {
    return {
      state: 'failed',
      message: `文件已保存，但 Git 提交失败：${errorMessage(error)}`,
    }
  }
}
