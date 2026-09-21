import type { NoteSummary } from '~~/shared/types/note'
import { isBlogMode } from '../../utils/app-mode'
import { listNotes } from '../../utils/note-store'

export default defineEventHandler(async (event): Promise<NoteSummary[]> => {
  if (!isBlogMode(event)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return listNotes('', { publishedOnly: true })
})
