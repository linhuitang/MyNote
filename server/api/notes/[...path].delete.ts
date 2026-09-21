import type { DeleteNoteBody, DeleteNoteResult } from '~~/shared/types/note'
import { syncNoteToGit } from '../../utils/git-sync'
import { removeNoteAttachments } from '../../utils/note-assets'
import { deleteNote } from '../../utils/note-store'

export default defineEventHandler(async (event): Promise<DeleteNoteResult> => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: '缺少笔记路径' })

  const body = await readBody<DeleteNoteBody>(event)
  if (typeof body?.revision !== 'string' || !body.revision) {
    throw createError({ statusCode: 400, statusMessage: '缺少笔记版本信息' })
  }

  const deletedPath = await deleteNote(path, body.revision, removeNoteAttachments)
  const git = await syncNoteToGit(deletedPath, 'delete')
  return { path: deletedPath, git }
})
