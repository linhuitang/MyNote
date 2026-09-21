import { getNoteHistoryDetail } from '../../utils/note-history'
import { assertNotesMode } from '../../utils/app-mode'

export default defineEventHandler(async (event) => {
  assertNotesMode(event)
  const hash = getRouterParam(event, 'hash')
  if (!hash) throw createError({ statusCode: 400, statusMessage: '缺少提交哈希' })

  const detail = await getNoteHistoryDetail(hash)
  if (!detail) throw createError({ statusCode: 404, statusMessage: '没有找到这条笔记更新记录' })
  return detail
})
