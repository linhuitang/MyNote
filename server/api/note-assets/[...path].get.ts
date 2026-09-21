import { readNoteAsset } from '../../utils/note-assets'

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: '缺少图片路径' })

  const asset = await readNoteAsset(path)
  setResponseHeader(event, 'content-type', asset.mimeType)
  setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  return asset.data
})
