import type { H3Event } from 'h3'

export function publicSiteUrl(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const configured = String(process.env.NUXT_PUBLIC_SITE_URL ?? config.public.siteUrl ?? '').trim()
  return (configured || getRequestURL(event).origin).replace(/\/+$/, '')
}

export function publicNotePath(path: string): string {
  return `/notes/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
