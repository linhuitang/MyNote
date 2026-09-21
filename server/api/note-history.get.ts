import { getNoteHistoryForNote } from '../utils/note-history'
import { normaliseNotePath } from '../utils/note-store'
import { assertNotesMode } from '../utils/app-mode'

export default defineEventHandler(async (event) => {
  assertNotesMode(event)
  const query = getQuery(event)
  if (typeof query.path !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少笔记路径' })
  }

  const notePath = normaliseNotePath(query.path)
  return getNoteHistoryForNote(notePath)
})
