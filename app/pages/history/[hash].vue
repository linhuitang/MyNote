<script setup lang="ts">
import type { NoteHistoryDetail } from '~~/shared/types/note'

interface DiffSection {
  title: string
  lines: string[]
}

const route = useRoute()
const config = useRuntimeConfig()
const hash = computed(() => String(route.params.hash || ''))
const { t, intlLocale } = useI18n()
const readOnly = useReadOnly()

const { data: detail, status, error, refresh } = await useFetch<NoteHistoryDetail>(() => `/api/history/${hash.value}`)

useHead(() => ({
  title: detail.value ? `${detail.value.subject} · ${config.public.appName}` : `${t('detail.pageTitle')} · ${config.public.appName}`,
}))

const changeLabels = computed(() => ({
  added: t('history.added'),
  modified: t('history.modified'),
  deleted: t('history.deleted'),
  renamed: t('history.renamed'),
}))

const diffSections = computed<DiffSection[]>(() => {
  if (!detail.value?.patch) return []
  const sections: DiffSection[] = []
  let current: DiffSection | null = null

  for (const line of detail.value.patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = { title: line.replace(/^diff --git a\//, '').replace(/ b\/.+$/, ''), lines: [line] }
      sections.push(current)
    }
    else if (current) {
      current.lines.push(line)
    }
  }
  return sections
})

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(intlLocale.value, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(value))
}

function lineType(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'file'
  if (line.startsWith('+')) return 'addition'
  if (line.startsWith('-')) return 'deletion'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file')) return 'meta'
  return 'context'
}
</script>

<template>
  <div class="page-shell">
    <header class="topbar">
      <AppBrand />
      <div class="topbar-actions">
        <ReadOnlyBadge v-if="readOnly" />
        <LanguageSelector />
        <ThemeToggle />
        <NuxtLink to="/history" class="secondary-button header-action-button">{{ t('detail.back') }}</NuxtLink>
      </div>
    </header>

    <main class="history-detail-page">
      <div v-if="status === 'pending'" class="page-message">{{ t('detail.loading') }}</div>
      <div v-else-if="error || !detail" class="page-message error-message">
        <p>{{ t('detail.notFound') }}</p>
        <button class="secondary-button" @click="() => refresh()">{{ t('common.retry') }}</button>
      </div>
      <template v-else>
        <section class="commit-summary">
          <div class="commit-summary-topline">
            <p class="eyebrow">{{ t('detail.eyebrow') }}</p>
            <code>{{ detail.shortHash }}</code>
          </div>
          <h1>{{ detail.subject }}</h1>
          <p>{{ t('detail.committedBy', { author: detail.author, date: formatDate(detail.committedAt) }) }}</p>
          <div class="commit-change-summary">
            <div v-for="change in detail.changes" :key="`${change.type}-${change.path}`" class="commit-change-item">
              <span class="change-badge" :data-type="change.type">{{ changeLabels[change.type] }}</span>
              <span><template v-if="change.previousPath">{{ change.previousPath }} → </template>{{ change.path }}</span>
            </div>
          </div>
        </section>

        <section class="diff-section-heading">
          <div>
            <h2>{{ t('detail.title') }}</h2>
            <p>{{ t('detail.description') }}</p>
          </div>
          <span>{{ t('detail.files', { count: detail.changes.length }) }}</span>
        </section>

        <div v-if="diffSections.length" class="diff-list">
          <article v-for="section in diffSections" :key="section.title" class="diff-card">
            <header>{{ section.title }}</header>
            <pre><code><span
              v-for="(line, index) in section.lines"
              :key="index"
              class="diff-line"
              :data-type="lineType(line)"
            >{{ line || ' ' }}
</span></code></pre>
          </article>
        </div>
        <div v-else class="empty-diff">{{ t('detail.emptyDiff') }}</div>
      </template>
    </main>
  </div>
</template>
