<script setup lang="ts">
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { stripFrontmatter } from '~~/shared/utils/markdown-metadata'

const props = defineProps<{ content: string, notePath?: string }>()

function imageUrl(href: string): string {
  if (!props.notePath || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(href)) return href

  const hrefPath = href.split(/[?#]/, 1)[0] || ''
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(hrefPath)
  }
  catch {
    return href
  }

  const segments = props.notePath.split('/').slice(0, -1)
  for (const segment of decodedPath.replaceAll('\\', '/').split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }

  if (!segments.some(segment => segment.endsWith('.assets'))) return href
  return `/api/note-assets/${segments.map(encodeURIComponent).join('/')}`
}

function openLinksInNewTabs(html: string): string {
  return html.replace(/<a(?=\s|>)/g, '<a target="_blank" rel="noopener noreferrer"')
}

const renderedContent = computed(() => {
  const html = marked.parse(stripFrontmatter(props.content), {
    breaks: true,
    walkTokens(token) {
      if (token.type === 'image') token.href = imageUrl(token.href)
    },
  })
  const sanitisedHtml = DOMPurify.sanitize(typeof html === 'string' ? html : '')
  return openLinksInNewTabs(sanitisedHtml)
})
</script>

<template>
  <article class="markdown-body" v-html="renderedContent" />
</template>
