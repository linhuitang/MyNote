<script setup lang="ts">
import type { NoteSummary, NotesPage } from '~~/shared/types/note'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
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
  return [...tags.values()].sort((a, b) => a.localeCompare(b, 'zh-CN'))
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
    ? `“${route.query.deleted}”已删除，但 Git 推送失败。`
    : `“${route.query.deleted}”已删除。`
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
  return new Intl.DateTimeFormat('zh-CN', {
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
        <ThemeToggle />
        <NuxtLink to="/history" class="secondary-button header-action-button">更新历史</NuxtLink>
        <button class="primary-button header-action-button" @click="newNoteDialogOpen = true">新建笔记</button>
      </div>
    </header>

    <main class="library-page">
      <div v-if="deletionNotice" class="notice-banner" :data-tone="route.query.sync === 'failed' ? 'warning' : 'success'">
        <span>{{ deletionNotice }}</span>
        <button type="button" aria-label="关闭提示" @click="dismissDeletionNotice">×</button>
      </div>
      <div class="search-row">
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            placeholder="搜索标题或正文内容"
            aria-label="搜索笔记标题和内容"
          >
          <button v-if="searchQuery" type="button" aria-label="清除搜索" @click="searchQuery = ''">×</button>
        </label>
        <div class="note-count-inline" aria-live="polite">
          <strong>{{ totalNotes }}</strong>
          <span>{{ debouncedQuery || selectedTag ? '篇匹配笔记' : '篇笔记' }}</span>
        </div>
      </div>

      <div v-if="availableTags.length" class="tag-filter" aria-label="按标签筛选笔记">
        <span class="tag-filter-label">标签</span>
        <button type="button" :class="{ active: !selectedTag }" @click="selectedTag = ''">全部</button>
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

      <div v-if="loading" class="page-message">正在读取笔记…</div>
      <div v-else-if="loadError" class="page-message error-message">
        <p>读取笔记失败，请检查笔记目录配置。</p>
        <button class="secondary-button" @click="resetNotes">重试</button>
      </div>
      <template v-else-if="notes.length">
        <section class="note-grid" aria-label="笔记列表">
          <NuxtLink v-for="note in notes" :key="note.path" :to="detailUrl(note.path)" class="note-card">
            <div class="note-card-topline">
              <time :datetime="note.updatedAt">{{ formatDate(note.updatedAt) }}</time>
              <div v-if="note.tags.length" class="note-card-top-tags">
                <span v-for="tag in note.tags" :key="tag" class="note-tag">{{ tag }}</span>
              </div>
            </div>
            <h2>{{ note.title }}</h2>
            <p>{{ note.excerpt || '这是一篇空白笔记。' }}</p>
            <div class="note-card-footer"><span>{{ note.path }}</span><span aria-hidden="true">→</span></div>
          </NuxtLink>
        </section>
        <div v-if="loadMoreError" class="load-more-error">
          <span>加载更多笔记失败</span>
          <button type="button" @click="loadMoreNotes">重试</button>
        </div>
        <InfiniteScrollTrigger
          v-else
          :has-more="hasMoreNotes"
          :loading="loadingMore"
          label="正在加载更多笔记…"
          @load="loadMoreNotes"
        />
      </template>
      <section v-else-if="debouncedQuery || selectedTag" class="empty-library search-empty">
        <h2>没有找到相关笔记</h2>
        <p v-if="selectedTag">当前搜索范围内没有“{{ selectedTag }}”标签的笔记。</p>
        <p v-else>没有标题或正文包含“{{ debouncedQuery }}”的笔记。</p>
        <button class="secondary-button" @click="searchQuery = ''; selectedTag = ''">清除筛选</button>
      </section>
      <section v-else class="empty-library">
        <div class="welcome-mark">M</div>
        <h2>写下第一篇笔记</h2>
        <p>新建一篇 Markdown 笔记，点击保存后写入文件并同步到 Git。</p>
        <button class="primary-button" @click="newNoteDialogOpen = true">新建笔记</button>
      </section>
    </main>

    <NewNoteDialog
      :open="newNoteDialogOpen"
      @close="newNoteDialogOpen = false"
      @create="createNote"
    />
  </div>
</template>
