export type GitSyncState = 'synced' | 'committed' | 'unchanged' | 'unavailable' | 'failed'

export interface GitSyncResult {
  state: GitSyncState
  message: string
}

export interface NoteSummary {
  path: string
  title: string
  excerpt: string
  tags: string[]
  updatedAt: string
  revision: string
  description?: string
  publishedAt?: string
  contentUpdatedAt?: string
  cover?: string
  draft?: boolean
}

export interface NoteDocument extends NoteSummary {
  content: string
}

export interface SaveNoteBody {
  content: string
  revision: string | null
}

export interface SaveNoteResult {
  note: NoteDocument
  git: GitSyncResult
}

export interface DeleteNoteBody {
  revision: string
}

export interface DeleteNoteResult {
  path: string
  git: GitSyncResult
}

export interface ImageUploadResult {
  token: string
  previewUrl: string
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface NotesPage extends PaginatedResult<NoteSummary> {
  availableTags: string[]
}

export type NoteChangeType = 'added' | 'modified' | 'deleted' | 'renamed'

export interface NoteHistoryChange {
  type: NoteChangeType
  path: string
  previousPath?: string
}

export interface NoteHistoryEntry {
  hash: string
  shortHash: string
  author: string
  committedAt: string
  subject: string
  changes: NoteHistoryChange[]
}

export interface NoteHistoryDetail extends NoteHistoryEntry {
  patch: string
}
