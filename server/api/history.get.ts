import type { NoteHistoryEntry, PaginatedResult } from '~~/shared/types/note'
import { getNoteHistory } from '../utils/note-history'
import { assertNotesMode } from '../utils/app-mode'

export default defineEventHandler(async (event): Promise<PaginatedResult<NoteHistoryEntry>> => {
  assertNotesMode(event)
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(query.pageSize || '10'), 10) || 10))
  const history = await getNoteHistory()
  const start = (page - 1) * pageSize

  return {
    items: history.slice(start, start + pageSize),
    page,
    pageSize,
    total: history.length,
    hasMore: start + pageSize < history.length,
  }
})
