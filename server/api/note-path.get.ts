import { noteExists } from '../utils/note-store'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  if (typeof query.path !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少笔记路径' })
  }
  return { exists: await noteExists(query.path) }
})
