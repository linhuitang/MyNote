import { listNotes } from '../../utils/note-store'
import type { NotesPage } from '~~/shared/types/note'

export default defineEventHandler(async (event): Promise<NotesPage> => {
  const query = getQuery(event)
  const searchQuery = typeof query.q === 'string' ? query.q : ''
  const selectedTag = typeof query.tag === 'string' ? query.tag.trim() : ''
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(query.pageSize || '12'), 10) || 12))
  const matchingSearch = await listNotes(searchQuery)
  const tags = new Map<string, string>()
  for (const note of matchingSearch) {
    for (const tag of note.tags) tags.set(tag.toLocaleLowerCase(), tag)
  }

  const filtered = selectedTag
    ? matchingSearch.filter(note => note.tags.some(tag => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase()))
    : matchingSearch
  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
    hasMore: start + pageSize < filtered.length,
    availableTags: [...tags.values()].sort((a, b) => a.localeCompare(b, 'zh-CN')),
  }
})
