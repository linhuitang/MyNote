<script setup lang="ts">
import type { NoteHistoryChange, NoteHistoryEntry, PaginatedResult } from '~~/shared/types/note'

const config = useRuntimeConfig()
useHead({ title: `更新历史 · ${config.public.appName}` })

const history = ref<NoteHistoryEntry[]>([])
const currentPage = ref(1)
const totalHistory = ref(0)
const hasMoreHistory = ref(false)
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)

async function fetchHistoryPage(page: number): Promise<PaginatedResult<NoteHistoryEntry>> {
  return $fetch<PaginatedResult<NoteHistoryEntry>>('/api/history', {
    query: { page, pageSize: 10 },
  })
}

async function resetHistory(): Promise<void> {
  loading.value = true
  loadError.value = false
  loadMoreError.value = false

  try {
    const result = await fetchHistoryPage(1)
    history.value = result.items
    currentPage.value = result.page
    totalHistory.value = result.total
    hasMoreHistory.value = result.hasMore
  }
  catch {
    history.value = []
    totalHistory.value = 0
    hasMoreHistory.value = false
    loadError.value = true
  }
  finally {
    loading.value = false
  }
}

async function loadMoreHistory(): Promise<void> {
  if (loading.value || loadingMore.value || !hasMoreHistory.value) return
  loadingMore.value = true
  loadMoreError.value = false

  try {
    const result = await fetchHistoryPage(currentPage.value + 1)
    const existingHashes = new Set(history.value.map(entry => entry.hash))
    history.value.push(...result.items.filter(entry => !existingHashes.has(entry.hash)))
    currentPage.value = result.page
    totalHistory.value = result.total
    hasMoreHistory.value = result.hasMore
  }
  catch {
    loadMoreError.value = true
  }
  finally {
    loadingMore.value = false
  }
}

const changeLabels = {
  added: '新增',
  modified: '修改',
  deleted: '删除',
  renamed: '重命名',
} as const

function detailUrl(path: string): string {
  return `/notes/${path.split('/').map(encodeURIComponent).join('/')}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function canOpen(change: NoteHistoryChange): boolean {
  return change.type !== 'deleted'
}

await resetHistory()
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <AppBrand />
      <div class="topbar-actions">
        <ThemeToggle />
        <NuxtLink to="/" class="secondary-button header-action-button">返回笔记</NuxtLink>
      </div>
    </header>

    <main class="history-page">
      <div class="history-heading">
        <div>
          <p class="eyebrow">Git history</p>
          <h1>笔记更新历史</h1>
          <p>这里记录通过 Git 保存的新增、修改、重命名和删除操作。</p>
        </div>
        <span class="history-count">{{ totalHistory }} 次更新</span>
      </div>

      <div v-if="loading" class="page-message">正在读取 Git 历史…</div>
      <div v-else-if="loadError" class="page-message error-message">
        <p>读取更新历史失败。</p>
        <button class="secondary-button" @click="resetHistory">重试</button>
      </div>
      <template v-else-if="history.length">
        <section class="history-list" aria-label="笔记更新历史">
          <article v-for="entry in history" :key="entry.hash" class="history-card">
            <div class="history-card-meta">
              <time :datetime="entry.committedAt">{{ formatDate(entry.committedAt) }}</time>
              <code>{{ entry.shortHash }}</code>
            </div>
            <h2>{{ entry.subject }}</h2>
            <p class="history-author">由 {{ entry.author }} 提交</p>

            <div class="change-list">
              <component
                :is="canOpen(change) ? resolveComponent('NuxtLink') : 'div'"
                v-for="change in entry.changes"
                :key="`${change.type}-${change.path}`"
                v-bind="canOpen(change) ? { to: detailUrl(change.path) } : {}"
                class="change-row"
                :class="{ 'is-link': canOpen(change) }"
              >
                <span class="change-badge" :data-type="change.type">{{ changeLabels[change.type] }}</span>
                <span class="change-path">
                  <template v-if="change.previousPath">{{ change.previousPath }} → </template>{{ change.path }}
                </span>
                <span v-if="canOpen(change)" aria-hidden="true">→</span>
              </component>
            </div>
            <NuxtLink :to="`/history/${entry.hash}`" class="history-detail-link">
              查看详细更改 <span aria-hidden="true">→</span>
            </NuxtLink>
          </article>
        </section>
        <div v-if="loadMoreError" class="load-more-error">
          <span>加载更多历史失败</span>
          <button type="button" @click="loadMoreHistory">重试</button>
        </div>
        <InfiniteScrollTrigger
          v-else
          :has-more="hasMoreHistory"
          :loading="loadingMore"
          label="正在加载更多历史…"
          @load="loadMoreHistory"
        />
      </template>
      <section v-else class="empty-library history-empty">
        <div class="welcome-mark">G</div>
        <h2>还没有更新记录</h2>
        <p>保存或删除一篇笔记后，Git 提交记录会显示在这里。</p>
        <NuxtLink to="/" class="primary-button">返回笔记列表</NuxtLink>
      </section>
    </main>
  </div>
</template>
