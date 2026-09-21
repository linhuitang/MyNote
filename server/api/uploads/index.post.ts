import type { ImageUploadResult } from '~~/shared/types/note'
import { cleanupExpiredUploads, storeTemporaryImage } from '../../utils/note-assets'
import { assertWritable } from '../../utils/read-only'

export default defineEventHandler(async (event): Promise<ImageUploadResult> => {
  assertWritable(event)
  const parts = await readMultipartFormData(event)
  const image = parts?.find(part => part.name === 'image' && part.data)
  if (!image) throw createError({ statusCode: 400, statusMessage: '请选择要上传的图片' })

  await cleanupExpiredUploads()
  return storeTemporaryImage(image.data)
})
