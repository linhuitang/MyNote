import { removeTemporaryImage } from '../../utils/note-assets'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: '缺少图片上传标识' })
  await removeTemporaryImage(token)
  return { deleted: true }
})
