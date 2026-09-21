import type { SaveNoteBody, SaveNoteResult } from '~~/shared/types/note'
import { syncNoteToGit } from '../../utils/git-sync'
import { finaliseTemporaryImages } from '../../utils/note-assets'
import { saveNote } from '../../utils/note-store'

export default defineEventHandler(async (event): Promise<SaveNoteResult> => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: '缺少笔记路径' })

  const body = await readBody<SaveNoteBody>(event)
  if (typeof body?.content !== 'string' || (body.revision !== null && typeof body.revision !== 'string')) {
    throw createError({ statusCode: 400, statusMessage: '保存内容格式错误' })
  }

  const note = await saveNote(path, body.content, body.revision, finaliseTemporaryImages)
  const git = await syncNoteToGit(note.path)
  return { note, git }
})
