<script setup lang="ts">
import type { NoteHistoryChange, NoteHistoryEntry, PaginatedResult } from '~~/shared/types/note'

const config = useRuntimeConfig()
const { t, intlLocale } = useI18n()
useHead(() => ({ title: `${t('history.pageTitle')} · ${config.public.appName}` }))

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

const changeLabels = computed(() => ({
  added: t('history.added'),
  modified: t('history.modified'),
  deleted: t('history.deleted'),
  renamed: t('history.renamed'),
}))

function detailUrl(path: string): string {
  return `/notes/${path.split('/').map(encodeURIComponent).join('/')}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(intlLocale.value, {
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
        <LanguageToggle />
        <ThemeToggle />
        <NuxtLink to="/" class="secondary-button header-action-button">{{ t('history.back') }}</NuxtLink>
      </div>
    </header>

    <main class="history-page">
      <div class="history-heading">
        <div>
          <p class="eyebrow">{{ t('history.eyebrow') }}</p>
          <h1>{{ t('history.title') }}</h1>
          <p>{{ t('history.description') }}</p>
        </div>
        <span class="history-count">{{ t('history.count', { count: totalHistory }) }}</span>
      </div>

      <div v-if="loading" class="page-message">{{ t('history.loading') }}</div>
      <div v-else-if="loadError" class="page-message error-message">
        <p>{{ t('history.loadFailed') }}</p>
        <button class="secondary-button" @click="resetHistory">{{ t('common.retry') }}</button>
      </div>
      <template v-else-if="history.length">
        <section class="history-list" :aria-label="t('history.list')">
          <article v-for="entry in history" :key="entry.hash" class="history-card">
            <div class="history-card-meta">
              <time :datetime="entry.committedAt">{{ formatDate(entry.committedAt) }}</time>
              <code>{{ entry.shortHash }}</code>
            </div>
            <h2>{{ entry.subject }}</h2>
            <p class="history-author">{{ t('history.byAuthor', { author: entry.author }) }}</p>

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
              {{ t('history.details') }} <span aria-hidden="true">→</span>
            </NuxtLink>
          </article>
        </section>
        <div v-if="loadMoreError" class="load-more-error">
          <span>{{ t('history.loadMoreFailed') }}</span>
          <button type="button" @click="loadMoreHistory">{{ t('common.retry') }}</button>
        </div>
        <InfiniteScrollTrigger
          v-else
          :has-more="hasMoreHistory"
          :loading="loadingMore"
          :label="t('history.loadingMore')"
          @load="loadMoreHistory"
        />
      </template>
      <section v-else class="empty-library history-empty">
        <div class="welcome-mark">G</div>
        <h2>{{ t('history.empty') }}</h2>
        <p>{{ t('history.emptyDescription') }}</p>
        <NuxtLink to="/" class="primary-button">{{ t('history.backToList') }}</NuxtLink>
      </section>
    </main>
  </div>
</template>
