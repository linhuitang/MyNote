import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { temporaryImagePath } from '../../utils/note-assets'

const mimeByExtension: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: '缺少图片上传标识' })

  try {
    const data = await readFile(temporaryImagePath(token))
    setResponseHeader(event, 'content-type', mimeByExtension[extname(token).toLowerCase()] || 'application/octet-stream')
    setResponseHeader(event, 'cache-control', 'no-store')
    return data
  }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: '临时图片不存在或已经失效' })
    }
    throw error
  }
})
