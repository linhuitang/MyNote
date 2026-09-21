<script setup lang="ts">
import type { NoteSummary } from '~~/shared/types/note'

const config = useRuntimeConfig()
const { isBlog } = useAppMode()
const { t, intlLocale } = useI18n()

if (!isBlog.value) await navigateTo('/', { replace: true })

const { data: posts, status } = await useFetch<NoteSummary[]>('/api/blog/archive', { default: () => [] })

const groupedPosts = computed(() => {
  const groups = new Map<string, NoteSummary[]>()
  for (const post of posts.value) {
    const date = new Date(post.publishedAt || post.updatedAt)
    const year = String(date.getFullYear())
    groups.set(year, [...(groups.get(year) || []), post])
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
})

function detailUrl(path: string): string {
  return `/notes/${path.split('/').map(encodeURIComponent).join('/')}`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(intlLocale.value, { month: 'short', day: 'numeric' }).format(new Date(value))
}

useHead(() => ({
  title: `${t('blog.archiveTitle')} · ${config.public.appName}`,
  meta: [{ name: 'description', content: t('blog.archiveDescription') }],
  link: String(config.public.siteUrl || '').trim()
    ? [{ rel: 'canonical', href: `${String(config.public.siteUrl).replace(/\/+$/, '')}/archive` }]
    : [],
}))
</script>

<template>
  <div class="page-shell blog-shell">
    <BlogHeader />
    <main class="blog-archive-page">
      <header class="blog-archive-heading">
        <p class="eyebrow">{{ t('blog.archive') }}</p>
        <h1>{{ t('blog.archiveTitle') }}</h1>
        <p>{{ t('blog.archiveDescription') }}</p>
      </header>

      <div v-if="status === 'pending'" class="page-message">{{ t('home.loading') }}</div>
      <div v-else-if="groupedPosts.length" class="blog-archive-groups">
        <section v-for="([year, yearPosts]) in groupedPosts" :key="year" class="blog-archive-group">
          <h2>{{ year }}</h2>
          <div class="blog-archive-list">
            <NuxtLink v-for="post in yearPosts" :key="post.path" :to="detailUrl(post.path)" class="blog-archive-item">
              <time :datetime="post.publishedAt || post.updatedAt">{{ formatDate(post.publishedAt || post.updatedAt) }}</time>
              <span>{{ post.title }}</span>
              <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
        </section>
      </div>
      <div v-else class="empty-library blog-empty">{{ t('blog.noPosts') }}</div>
    </main>
  </div>
</template>
