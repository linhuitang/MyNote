import type { H3Event } from 'h3'

export function isBlogMode(event: H3Event): boolean {
  const config = useRuntimeConfig(event)
  return String(process.env.NUXT_PUBLIC_APP_MODE ?? config.public.appMode).toLowerCase() === 'blog'
}

export function assertNotesMode(event: H3Event): void {
  if (!isBlogMode(event)) return
  throw createError({ statusCode: 404, statusMessage: 'Not found' })
}
