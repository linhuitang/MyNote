<script setup lang="ts">
import type { NoteHistoryDetail } from '~~/shared/types/note'

interface DiffSection {
  title: string
  lines: string[]
}

const route = useRoute()
const config = useRuntimeConfig()
const hash = computed(() => String(route.params.hash || ''))

const { data: detail, status, error, refresh } = await useFetch<NoteHistoryDetail>(() => `/api/history/${hash.value}`)

useHead(() => ({
  title: detail.value ? `${detail.value.subject} · ${config.public.appName}` : `更新详情 · ${config.public.appName}`,
}))

const changeLabels = {
  added: '新增',
  modified: '修改',
  deleted: '删除',
  renamed: '重命名',
} as const

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
  return new Intl.DateTimeFormat('zh-CN', {
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
        <ThemeToggle />
        <NuxtLink to="/history" class="secondary-button header-action-button">返回更新历史</NuxtLink>
      </div>
    </header>

    <main class="history-detail-page">
      <div v-if="status === 'pending'" class="page-message">正在读取详细更改…</div>
      <div v-else-if="error || !detail" class="page-message error-message">
        <p>没有找到这条更新记录，或记录中不包含笔记更改。</p>
        <button class="secondary-button" @click="() => refresh()">重试</button>
      </div>
      <template v-else>
        <section class="commit-summary">
          <div class="commit-summary-topline">
            <p class="eyebrow">Commit detail</p>
            <code>{{ detail.shortHash }}</code>
          </div>
          <h1>{{ detail.subject }}</h1>
          <p>{{ detail.author }} 提交于 {{ formatDate(detail.committedAt) }}</p>
          <div class="commit-change-summary">
            <div v-for="change in detail.changes" :key="`${change.type}-${change.path}`" class="commit-change-item">
              <span class="change-badge" :data-type="change.type">{{ changeLabels[change.type] }}</span>
              <span><template v-if="change.previousPath">{{ change.previousPath }} → </template>{{ change.path }}</span>
            </div>
          </div>
        </section>

        <section class="diff-section-heading">
          <div>
            <h2>详细更改</h2>
            <p>绿色表示新增内容，红色表示删除内容。</p>
          </div>
          <span>{{ detail.changes.length }} 个文件</span>
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
        <div v-else class="empty-diff">这条提交没有可显示的文本差异。</div>
      </template>
    </main>
  </div>
</template>
