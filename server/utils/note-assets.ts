import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, resolve, sep } from 'node:path'
import { getNotesRoot, normaliseNotePath } from './note-store'

const maximumImageBytes = 10 * 1024 * 1024
const temporaryUploadLifetime = 24 * 60 * 60 * 1000
const uploadTokenPattern = /^[0-9a-f-]{36}\.(?:png|jpe?g|webp|gif)$/i
const temporaryImagePattern = /\/api\/uploads\/([0-9a-f-]{36}\.(?:png|jpe?g|webp|gif))/gi

const mimeByExtension: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function uploadRoot(): string {
  return resolve(tmpdir(), 'mynote-uploads')
}

function detectedExtension(data: Buffer): string | null {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png'
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return '.jpg'
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return '.webp'
  if (data.length >= 6 && ['GIF87a', 'GIF89a'].includes(data.toString('ascii', 0, 6))) return '.gif'
  return null
}

export function normaliseUploadToken(input: string): string {
  const token = decodeURIComponent(input)
  if (!uploadTokenPattern.test(token)) {
    throw createError({ statusCode: 400, statusMessage: '图片上传标识无效' })
  }
  return token.toLowerCase()
}

export function temporaryImagePath(tokenInput: string): string {
  return resolve(uploadRoot(), normaliseUploadToken(tokenInput))
}

export async function storeTemporaryImage(data: Buffer): Promise<{ token: string, previewUrl: string }> {
  if (!data.length) throw createError({ statusCode: 400, statusMessage: '图片内容为空' })
  if (data.length > maximumImageBytes) throw createError({ statusCode: 413, statusMessage: '单张图片不能超过 10 MB' })

  const extension = detectedExtension(data)
  if (!extension) throw createError({ statusCode: 415, statusMessage: '仅支持 PNG、JPEG、WebP 和 GIF 图片' })

  await mkdir(uploadRoot(), { recursive: true })
  const token = `${randomUUID()}${extension}`
  await writeFile(resolve(uploadRoot(), token), data)
  return { token, previewUrl: `/api/uploads/${token}` }
}

export async function removeTemporaryImage(tokenInput: string): Promise<void> {
  await unlink(temporaryImagePath(tokenInput)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}

export async function cleanupExpiredUploads(): Promise<void> {
  const root = uploadRoot()
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  const cutoff = Date.now() - temporaryUploadLifetime
  await Promise.all(entries.map(async (entry) => {
    if (!entry.isFile() || !uploadTokenPattern.test(entry.name)) return
    const path = resolve(root, entry.name)
    const fileStat = await stat(path).catch(() => null)
    if (fileStat && fileStat.mtimeMs < cutoff) await unlink(path).catch(() => undefined)
  }))
}

export function attachmentDirectoryForNote(notePathInput: string): string {
  const notePath = normaliseNotePath(notePathInput)
  const noteFilename = basename(notePath, '.md')
  return resolve(getNotesRoot(), dirname(notePath), `${noteFilename}.assets`)
}

export async function finaliseTemporaryImages(notePathInput: string, content: string): Promise<string> {
  const notePath = normaliseNotePath(notePathInput)
  const matches = [...content.matchAll(temporaryImagePattern)]
  if (!matches.length) return content

  const attachmentDirectory = attachmentDirectoryForNote(notePath)
  const attachmentName = `${basename(notePath, '.md')}.assets`
  await mkdir(attachmentDirectory, { recursive: true })

  let finalContent = content
  for (const token of new Set(matches.map(match => normaliseUploadToken(match[1] || '')))) {
    const source = temporaryImagePath(token)
    const extension = extname(token)
    const filename = `${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}${extension}`
    const destination = resolve(attachmentDirectory, filename)

    try {
      await copyFile(source, destination)
    }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createError({ statusCode: 410, statusMessage: '待保存的图片已失效，请重新插入' })
      }
      throw error
    }

    finalContent = finalContent.replaceAll(`/api/uploads/${token}`, `./${attachmentName}/${filename}`)
    await removeTemporaryImage(token)
  }

  return finalContent
}

export async function removeNoteAttachments(notePathInput: string): Promise<void> {
  await rm(attachmentDirectoryForNote(notePathInput), { recursive: true, force: true })
}

export function resolveNoteAssetPath(pathInput: string): { absolutePath: string, mimeType: string } {
  const decoded = decodeURIComponent(pathInput).replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+/g, '/')
  const parts = decoded.split('/')
  const extension = extname(decoded).toLowerCase()
  if (
    !decoded
    || decoded.startsWith('../')
    || decoded.includes('/../')
    || !parts.some(part => part.endsWith('.assets'))
    || !mimeByExtension[extension]
  ) {
    throw createError({ statusCode: 400, statusMessage: '图片路径无效' })
  }

  const root = getNotesRoot()
  const absolutePath = resolve(root, decoded)
  if (!absolutePath.startsWith(`${root}${sep}`)) {
    throw createError({ statusCode: 400, statusMessage: '图片路径超出允许范围' })
  }

  return { absolutePath, mimeType: mimeByExtension[extension]! }
}

export async function readNoteAsset(pathInput: string): Promise<{ data: Buffer, mimeType: string }> {
  const { absolutePath, mimeType } = resolveNoteAssetPath(pathInput)
  try {
    return { data: await readFile(absolutePath), mimeType }
  }
  catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: '图片不存在' })
    }
    throw error
  }
}
