import { readNote } from '../../utils/note-store'

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: '缺少笔记路径' })
  return readNote(path)
})
