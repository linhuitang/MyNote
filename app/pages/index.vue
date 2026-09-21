<script setup lang="ts">
import type { NoteSummary, NotesPage } from '~~/shared/types/note'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const { t, intlLocale } = useI18n()
useHead({ title: config.public.appName })

const searchQuery = ref('')
const debouncedQuery = ref('')
const selectedTag = ref('')
const newNoteDialogOpen = ref(false)
const notes = ref<NoteSummary[]>([])
const serverTags = ref<string[]>([])
const currentPage = ref(1)
const totalNotes = ref(0)
const hasMoreNotes = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

const availableTags = computed(() => {
  const tags = new Map(serverTags.value.map(tag => [tag.toLocaleLowerCase(), tag]))
  if (selectedTag.value) tags.set(selectedTag.value.toLocaleLowerCase(), selectedTag.value)
  return [...tags.values()].sort((a, b) => a.localeCompare(b, intlLocale.value))
})

async function fetchNotesPage(page: number): Promise<NotesPage> {
  return $fetch<NotesPage>('/api/notes', {
    query: {
      q: debouncedQuery.value || undefined,
      tag: selectedTag.value || undefined,
      page,
      pageSize: 12,
    },
  })
}

async function resetNotes(): Promise<void> {
  const version = ++requestVersion
  loading.value = true
  loadingMore.value = false
  loadError.value = false
  loadMoreError.value = false

  try {
    const result = await fetchNotesPage(1)
    if (version !== requestVersion) return
    notes.value = result.items
    serverTags.value = result.availableTags
    currentPage.value = result.page
    totalNotes.value = result.total
    hasMoreNotes.value = result.hasMore
  }
  catch {
    if (version === requestVersion) {
      notes.value = []
      totalNotes.value = 0
      hasMoreNotes.value = false
      loadError.value = true
    }
  }
  finally {
    if (version === requestVersion) loading.value = false
  }
}

async function loadMoreNotes(): Promise<void> {
  if (loading.value || loadingMore.value || !hasMoreNotes.value) return
  const version = requestVersion
  loadingMore.value = true
  loadMoreError.value = false

  try {
    const result = await fetchNotesPage(currentPage.value + 1)
    if (version !== requestVersion) return
    const existingPaths = new Set(notes.value.map(note => note.path))
    notes.value.push(...result.items.filter(note => !existingPaths.has(note.path)))
    currentPage.value = result.page
    totalNotes.value = result.total
    hasMoreNotes.value = result.hasMore
  }
  catch {
    if (version === requestVersion) loadMoreError.value = true
  }
  finally {
    if (version === requestVersion) loadingMore.value = false
  }
}

watch(searchQuery, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedQuery.value = value.trim()
  }, 250)
})

watch([debouncedQuery, selectedTag], () => {
  void resetNotes()
})

onBeforeUnmount(() => clearTimeout(searchTimer))

const deletionNotice = computed(() => {
  if (typeof route.query.deleted !== 'string') return ''
  return route.query.sync === 'failed'
    ? t('home.deletedPushFailed', { title: route.query.deleted })
    : t('home.deleted', { title: route.query.deleted })
})

async function dismissDeletionNotice(): Promise<void> {
  await router.replace({ path: '/' })
}

function slugFor(title: string): string {
  const value = title.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return value || `note-${Date.now()}`
}

function detailUrl(path: string): string {
  return `/notes/${path.split('/').map(encodeURIComponent).join('/')}`
}

async function createNote(title: string): Promise<void> {
  const base = slugFor(title)
  let path = `${base}.md`
  let suffix = 2
  while ((await $fetch<{ exists: boolean }>('/api/note-path', { query: { path } })).exists) {
    path = `${base}-${suffix++}.md`
  }

  newNoteDialogOpen.value = false
  await navigateTo({ path: detailUrl(path), query: { new: '1', title } })
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(intlLocale.value, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

await resetNotes()
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <AppBrand />
      <div class="topbar-actions">
        <LanguageToggle />
        <ThemeToggle />
        <NuxtLink to="/history" class="secondary-button header-action-button">{{ t('home.history') }}</NuxtLink>
        <button class="primary-button header-action-button" @click="newNoteDialogOpen = true">{{ t('home.newNote') }}</button>
      </div>
    </header>

    <main class="library-page">
      <div v-if="deletionNotice" class="notice-banner" :data-tone="route.query.sync === 'failed' ? 'warning' : 'success'">
        <span>{{ deletionNotice }}</span>
        <button type="button" :aria-label="t('common.close')" @click="dismissDeletionNotice">×</button>
      </div>
      <div class="search-row">
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            :placeholder="t('home.searchPlaceholder')"
            :aria-label="t('home.searchLabel')"
          >
          <button v-if="searchQuery" type="button" :aria-label="t('home.clearSearch')" @click="searchQuery = ''">×</button>
        </label>
        <div class="note-count-inline" aria-live="polite">
          <strong>{{ totalNotes }}</strong>
          <span>{{ debouncedQuery || selectedTag ? t('home.matches') : t('home.notes') }}</span>
        </div>
      </div>

      <div v-if="availableTags.length" class="tag-filter" :aria-label="t('home.filterByTag')">
        <span class="tag-filter-label">{{ t('home.tags') }}</span>
        <button type="button" :class="{ active: !selectedTag }" @click="selectedTag = ''">{{ t('home.all') }}</button>
        <button
          v-for="tag in availableTags"
          :key="tag"
          type="button"
          :class="{ active: selectedTag === tag }"
          @click="selectedTag = selectedTag === tag ? '' : tag"
        >
          {{ tag }}
        </button>
      </div>

      <div v-if="loading" class="page-message">{{ t('home.loading') }}</div>
      <div v-else-if="loadError" class="page-message error-message">
        <p>{{ t('home.loadFailed') }}</p>
        <button class="secondary-button" @click="resetNotes">{{ t('common.retry') }}</button>
      </div>
      <template v-else-if="notes.length">
        <section class="note-grid" :aria-label="t('home.noteList')">
          <NuxtLink v-for="note in notes" :key="note.path" :to="detailUrl(note.path)" class="note-card">
            <div class="note-card-topline">
              <time :datetime="note.updatedAt">{{ formatDate(note.updatedAt) }}</time>
              <div v-if="note.tags.length" class="note-card-top-tags">
                <span v-for="tag in note.tags" :key="tag" class="note-tag">{{ tag }}</span>
              </div>
            </div>
            <h2>{{ note.title }}</h2>
            <p>{{ note.excerpt || t('home.emptyNote') }}</p>
            <div class="note-card-footer"><span>{{ note.path }}</span><span aria-hidden="true">→</span></div>
          </NuxtLink>
        </section>
        <div v-if="loadMoreError" class="load-more-error">
          <span>{{ t('home.loadMoreFailed') }}</span>
          <button type="button" @click="loadMoreNotes">{{ t('common.retry') }}</button>
        </div>
        <InfiniteScrollTrigger
          v-else
          :has-more="hasMoreNotes"
          :loading="loadingMore"
          :label="t('home.loadingMore')"
          @load="loadMoreNotes"
        />
      </template>
      <section v-else-if="debouncedQuery || selectedTag" class="empty-library search-empty">
        <h2>{{ t('home.noResults') }}</h2>
        <p v-if="selectedTag">{{ t('home.noTagResults', { tag: selectedTag }) }}</p>
        <p v-else>{{ t('home.noTextResults', { query: debouncedQuery }) }}</p>
        <button class="secondary-button" @click="searchQuery = ''; selectedTag = ''">{{ t('home.clearFilters') }}</button>
      </section>
      <section v-else class="empty-library">
        <div class="welcome-mark">M</div>
        <h2>{{ t('home.firstNote') }}</h2>
        <p>{{ t('home.firstNoteDescription') }}</p>
        <button class="primary-button" @click="newNoteDialogOpen = true">{{ t('home.newNote') }}</button>
      </section>
    </main>

    <NewNoteDialog
      :open="newNoteDialogOpen"
      @close="newNoteDialogOpen = false"
      @create="createNote"
    />
  </div>
</template>
