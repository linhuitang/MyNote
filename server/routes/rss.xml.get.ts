import { isBlogMode } from '../utils/app-mode'
import { listNotes } from '../utils/note-store'
import { escapeXml, publicNotePath, publicSiteUrl } from '../utils/site'

export default defineEventHandler(async (event) => {
  if (!isBlogMode(event)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const config = useRuntimeConfig(event)
  const baseUrl = publicSiteUrl(event)
  const posts = await listNotes('', { publishedOnly: true })
  const items = posts.map(post => {
    const url = `${baseUrl}${publicNotePath(post.path)}`
    const publishedAt = post.publishedAt || post.updatedAt
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <description>${escapeXml(post.description || post.excerpt)}</description>`,
      `      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>`,
      ...post.tags.map(tag => `      <category>${escapeXml(tag)}</category>`),
      '    </item>',
    ].join('\n')
  }).join('\n')

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(String(config.public.appName))}</title>`,
    `    <link>${escapeXml(baseUrl)}</link>`,
    `    <description>${escapeXml(String(config.public.blogDescription))}</description>`,
    `    <atom:link href="${escapeXml(`${baseUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    '    <language>en</language>',
    items,
    '  </channel>',
    '</rss>',
  ].join('\n')
})
