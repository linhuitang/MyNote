import { isBlogMode } from '../utils/app-mode'
import { listNotes } from '../utils/note-store'
import { escapeXml, publicNotePath, publicSiteUrl } from '../utils/site'

export default defineEventHandler(async (event) => {
  if (!isBlogMode(event)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const baseUrl = publicSiteUrl(event)
  const posts = await listNotes('', { publishedOnly: true })
  const urls = [
    `  <url><loc>${escapeXml(baseUrl)}</loc></url>`,
    `  <url><loc>${escapeXml(`${baseUrl}/archive`)}</loc></url>`,
    ...posts.map(post => {
      const lastModified = post.contentUpdatedAt || post.publishedAt || post.updatedAt
      return `  <url><loc>${escapeXml(`${baseUrl}${publicNotePath(post.path)}`)}</loc><lastmod>${escapeXml(lastModified)}</lastmod></url>`
    }),
  ]

  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('\n')
})
