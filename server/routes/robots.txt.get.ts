import { isBlogMode } from '../utils/app-mode'
import { publicSiteUrl } from '../utils/site'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  if (!isBlogMode(event)) return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\nSitemap: ${publicSiteUrl(event)}/sitemap.xml\n`
})
