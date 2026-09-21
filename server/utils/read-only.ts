import type { H3Event } from 'h3'
import { isBlogMode } from './app-mode'

function isEnabled(value: unknown): boolean {
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
}

export function assertWritable(event: H3Event): void {
  if (isBlogMode(event)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This MyNote blog is read-only',
    })
  }

  const config = useRuntimeConfig(event)
  const configuredValue = process.env.NUXT_PUBLIC_READ_ONLY ?? config.public.readOnly
  if (!isEnabled(configuredValue)) return

  throw createError({
    statusCode: 403,
    statusMessage: 'This MyNote instance is read-only',
  })
}
