<script setup lang="ts">
import type { DeleteNoteResult, ImageUploadResult, NoteDocument, NoteHistoryEntry, SaveNoteResult } from '~~/shared/types/note'
import type { MarkdownCommand } from '~~/shared/types/editor'
import { setMarkdownTags, tagsFromMarkdown } from '~~/shared/utils/markdown-metadata'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { t, intlLocale } = useI18n()
const note = ref<NoteDocument | null>(null)
const content = ref('')
const savedContent = ref('')
const loading = ref(true)
const saving = ref(false)
const uploadingImages = ref(false)
const deleting = ref(false)
const deleteDialogOpen = ref(false)
const deleteError = ref('')
const editing = ref(route.query.new === '1')
const mobileView = ref<'edit' | 'preview'>('edit')
const statusMessage = ref('')
const statusTone = ref<'neutral' | 'success' | 'warning' | 'error'>('neutral')
const markdownEditor = useTemplateRef<HTMLTextAreaElement>('markdownEditor')
const imageInput = useTemplateRef<HTMLInputElement>('imageInput')
const temporaryUploads = new Set<string>()

const notePath = computed(() => {
  const parameter = route.params.path
  return Array.isArray(parameter) ? parameter.join('/') : String(parameter || '')
})
const apiUrl = computed(() => `/api/notes/${notePath.value.split('/').map(encodeURIComponent).join('/')}`)
const isDirty = computed(() => content.value !== savedContent.value)
const title = computed(() => content.value.match(/^\s*#\s+(.+)$/m)?.[1]?.trim() || note.value?.title || t('editor.untitled'))
const tags = computed(() => tagsFromMarkdown(content.value))

const { data: noteHistory, status: historyStatus, refresh: refreshHistory } = await useFetch<NoteHistoryEntry[]>('/api/note-history', {
  default: () => [],
  query: computed(() => ({ path: notePath.value })),
})

useHead(() => ({ title: `${title.value} · ${config.public.appName}` }))

async function loadNote(): Promise<void> {
  loading.value = true
  statusMessage.value = ''
  try {
    if (route.query.new === '1') {
      const newTitle = typeof route.query.title === 'string' ? route.query.title : t('editor.untitled')
      note.value = {
        path: notePath.value,
        title: newTitle,
        excerpt: '',
        tags: [],
        updatedAt: new Date().toISOString(),
        revision: '',
        content: '',
      }
      content.value = `# ${newTitle}\n\n`
      savedContent.value = ''
      statusMessage.value = t('editor.newUnsaved')
      statusTone.value = 'warning'
      return
    }

    const document = await $fetch<NoteDocument>(apiUrl.value)
    note.value = document
    content.value = document.content
    savedContent.value = document.content
  }
  catch (error: any) {
    if (error?.statusCode === 404 || error?.response?.status === 404) {
      throw createError({ statusCode: 404, statusMessage: t('editor.notFound') })
    }
    statusMessage.value = t('editor.loadFailed')
    statusTone.value = 'error'
  }
  finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!note.value || saving.value || uploadingImages.value || !isDirty.value) return
  saving.value = true
  statusMessage.value = t('editor.saving')
  statusTone.value = 'neutral'
  try {
    const result = await $fetch<SaveNoteResult>(apiUrl.value, {
      method: 'PUT',
      body: { content: content.value, revision: note.value.revision || null },
    })
    note.value = result.note
    content.value = result.note.content
    savedContent.value = result.note.content
    await discardTemporaryUploads()
    statusMessage.value = t(`git.${result.git.state}`)
    statusTone.value = result.git.state === 'synced' || result.git.state === 'committed' || result.git.state === 'unchanged'
      ? 'success'
      : result.git.state === 'failed' ? 'error' : 'warning'
    if (route.query.new === '1') await router.replace({ path: route.path })
    await refreshHistory()
    editing.value = false
  }
  catch (error: any) {
    statusMessage.value = error?.statusCode === 409 || error?.response?.status === 409
      ? t('editor.conflict')
      : t('editor.saveFailed')
    statusTone.value = 'error'
  }
  finally {
    saving.value = false
  }
}

async function goBack(): Promise<void> {
  if (uploadingImages.value) return
  if (isDirty.value && !window.confirm(t('editor.backConfirm'))) return
  await discardTemporaryUploads()
  savedContent.value = content.value
  await navigateTo('/')
}

function startEditing(): void {
  editing.value = true
  mobileView.value = 'edit'
  statusMessage.value = ''
}

function updateTags(nextTags: string[]): void {
  content.value = setMarkdownTags(content.value, nextTags)
}

function openDeleteDialog(): void {
  deleteError.value = ''
  deleteDialogOpen.value = true
}

async function confirmDelete(): Promise<void> {
  if (!note.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''

  try {
    const result = await $fetch<DeleteNoteResult>(apiUrl.value, {
      method: 'DELETE',
      body: { revision: note.value.revision },
    })
    deleteDialogOpen.value = false
    await navigateTo({
      path: '/',
      query: { deleted: note.value.title, sync: result.git.state },
    })
  }
  catch (error: any) {
    deleteError.value = t('delete.failed')
  }
  finally {
    deleting.value = false
  }
}

async function cancelEditing(): Promise<void> {
  if (uploadingImages.value) return
  if (isDirty.value && !window.confirm(t('editor.discardConfirm'))) return

  await discardTemporaryUploads()

  if (route.query.new === '1') {
    savedContent.value = content.value
    await navigateTo('/')
    return
  }

  content.value = savedContent.value
  editing.value = false
  statusMessage.value = ''
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!isDirty.value && !uploadingImages.value) return
  event.preventDefault()
}

function formatHistoryDate(value: string): string {
  return new Intl.DateTimeFormat(intlLocale.value, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

async function discardTemporaryUploads(): Promise<void> {
  const tokens = [...temporaryUploads]
  temporaryUploads.clear()
  await Promise.all(tokens.map(token => $fetch(`/api/uploads/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  }).catch(() => undefined)))
}

function imageAltText(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '').trim() || t('editor.image')
}

async function uploadImages(files: File[]): Promise<void> {
  const images = files.filter(file => file.type.startsWith('image/'))
  if (!images.length || uploadingImages.value) return

  uploadingImages.value = true
  statusMessage.value = images.length > 1 ? t('editor.uploadingMany', { count: images.length }) : t('editor.uploadingOne')
  statusTone.value = 'neutral'

  try {
    for (const file of images) {
      const form = new FormData()
      form.append('image', file)
      const uploaded = await $fetch<ImageUploadResult>('/api/uploads', { method: 'POST', body: form })
      temporaryUploads.add(uploaded.token)

      const editor = markdownEditor.value
      if (!editor) continue
      const before = content.value.slice(0, editor.selectionStart)
      const after = content.value.slice(editor.selectionEnd)
      const prefix = before && !before.endsWith('\n') ? '\n' : ''
      const suffix = after && !after.startsWith('\n') ? '\n' : ''
      const markdown = `${prefix}![${imageAltText(file)}](${uploaded.previewUrl})${suffix}`
      await setEditorContent(markdown, markdown.length, markdown.length)
    }

    statusMessage.value = t('editor.imageInserted')
    statusTone.value = 'warning'
  }
  catch (error: any) {
    statusMessage.value = t('editor.imageUploadFailed')
    statusTone.value = 'error'
  }
  finally {
    uploadingImages.value = false
  }
}

function handleImageInput(event: Event): void {
  const input = event.target as HTMLInputElement
  void uploadImages(Array.from(input.files || []))
  input.value = ''
}

function handleEditorPaste(event: ClipboardEvent): void {
  const files = Array.from(event.clipboardData?.files || []).filter(file => file.type.startsWith('image/'))
  if (!files.length) return
  event.preventDefault()
  void uploadImages(files)
}

function handleEditorDrop(event: DragEvent): void {
  const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'))
  if (!files.length) return
  void uploadImages(files)
}

async function setEditorContent(replacement: string, selectionStart: number, selectionEnd: number): Promise<void> {
  const editor = markdownEditor.value
  if (!editor) return
  const start = editor.selectionStart
  const end = editor.selectionEnd

  editor.focus()
  editor.setSelectionRange(start, end)

  // insertText keeps toolbar edits in the textarea's native undo history.
  const inserted = document.execCommand('insertText', false, replacement)
  if (!inserted) {
    editor.setRangeText(replacement, start, end, 'end')
    editor.dispatchEvent(new Event('input', { bubbles: true }))
  }

  await nextTick()
  markdownEditor.value?.setSelectionRange(start + selectionStart, start + selectionEnd)
}

async function wrapSelection(before: string, after: string, placeholder: string): Promise<void> {
  const editor = markdownEditor.value
  if (!editor) return
  const selected = content.value.slice(editor.selectionStart, editor.selectionEnd)
  const inner = selected || placeholder
  await setEditorContent(`${before}${inner}${after}`, before.length, before.length + inner.length)
}

async function prefixSelectedLines(prefix: string | ((index: number) => string)): Promise<void> {
  const editor = markdownEditor.value
  if (!editor) return
  const lineStart = content.value.lastIndexOf('\n', Math.max(0, editor.selectionStart - 1)) + 1
  const nextLineBreak = content.value.indexOf('\n', editor.selectionEnd)
  const lineEnd = nextLineBreak === -1 ? content.value.length : nextLineBreak
  const selectedLines = content.value.slice(lineStart, lineEnd).split('\n')
  const replacement = selectedLines.map((line, index) => `${typeof prefix === 'function' ? prefix(index) : prefix}${line}`).join('\n')
  const originalStart = editor.selectionStart
  const originalEnd = editor.selectionEnd
  editor.setSelectionRange(lineStart, lineEnd)
  const firstPrefixLength = typeof prefix === 'function' ? prefix(0).length : prefix.length
  const addedLength = replacement.length - (lineEnd - lineStart)
  await setEditorContent(
    replacement,
    Math.max(firstPrefixLength, originalStart - lineStart + firstPrefixLength),
    Math.max(firstPrefixLength, originalEnd - lineStart + addedLength),
  )
}

async function applyHeading(level: 1 | 2): Promise<void> {
  const editor = markdownEditor.value
  if (!editor) return
  const lineStart = content.value.lastIndexOf('\n', Math.max(0, editor.selectionStart - 1)) + 1
  const nextLineBreak = content.value.indexOf('\n', editor.selectionEnd)
  const lineEnd = nextLineBreak === -1 ? content.value.length : nextLineBreak
  const line = content.value.slice(lineStart, lineEnd)
  const replacement = `${'#'.repeat(level)} ${line.replace(/^#{1,6}\s+/, '')}`
  editor.setSelectionRange(lineStart, lineEnd)
  await setEditorContent(replacement, replacement.length, replacement.length)
}

async function applyMarkdownCommand(command: MarkdownCommand): Promise<void> {
  if (!markdownEditor.value) return

  switch (command) {
    case 'heading-one': return applyHeading(1)
    case 'heading-two': return applyHeading(2)
    case 'bold': return wrapSelection('**', '**', t('editor.placeholderBold'))
    case 'italic': return wrapSelection('*', '*', t('editor.placeholderItalic'))
    case 'strike': return wrapSelection('~~', '~~', t('editor.placeholderStrike'))
    case 'inline-code': return wrapSelection('`', '`', t('editor.placeholderCode'))
    case 'link': {
      const editor = markdownEditor.value
      const selected = content.value.slice(editor.selectionStart, editor.selectionEnd) || t('editor.placeholderLink')
      const replacement = `[${selected}](https://)`
      return setEditorContent(replacement, selected.length + 3, selected.length + 11)
    }
    case 'quote': return prefixSelectedLines('> ')
    case 'bullet-list': return prefixSelectedLines('- ')
    case 'numbered-list': return prefixSelectedLines(index => `${index + 1}. `)
    case 'task-list': return prefixSelectedLines('- [ ] ')
    case 'code-block': return wrapSelection('```\n', '\n```', t('editor.placeholderCodeBlock'))
    case 'image': imageInput.value?.click(); return
  }
}

onBeforeRouteLeave(() => {
  if (uploadingImages.value) return false
  if (!isDirty.value) return true
  const leave = window.confirm(t('editor.leaveConfirm'))
  if (leave) {
    void discardTemporaryUploads()
    savedContent.value = content.value
  }
  return leave
})
onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))

await loadNote()
</script>

<template>
  <div class="detail-shell">
    <header class="topbar detail-topbar">
      <div class="detail-navigation">
        <button class="back-button" :aria-label="t('editor.back')" @click="goBack">←</button>
        <AppBrand />
      </div>
      <div class="save-group">
        <LanguageToggle />
        <ThemeToggle />
        <template v-if="editing">
          <span v-if="statusMessage" class="sync-status" :data-tone="statusTone">{{ statusMessage }}</span>
          <span v-else-if="isDirty" class="sync-status" data-tone="warning">{{ t('editor.unsaved') }}</span>
          <button class="secondary-button header-action-button" :disabled="saving || uploadingImages" @click="cancelEditing">{{ t('editor.cancel') }}</button>
          <button class="primary-button header-action-button" :disabled="!note || !isDirty || saving || uploadingImages" @click="save">
            {{ uploadingImages ? t('editor.uploading') : saving ? t('editor.saving') : t('editor.saveButton') }}
          </button>
        </template>
        <template v-else>
          <button class="danger-text-button header-action-button" @click="openDeleteDialog">{{ t('editor.delete') }}</button>
          <button class="primary-button header-action-button" @click="startEditing">{{ t('editor.edit') }}</button>
        </template>
      </div>
    </header>

    <main v-if="loading" class="page-message detail-loading">{{ t('editor.loading') }}</main>
    <main v-else-if="note" class="detail-page">
      <template v-if="editing">
        <div class="view-switcher mobile-only">
          <button :class="{ active: mobileView === 'edit' }" @click="mobileView = 'edit'">{{ t('editor.edit') }}</button>
          <button :class="{ active: mobileView === 'preview' }" @click="mobileView = 'preview'">{{ t('editor.preview') }}</button>
        </div>
        <NoteTagEditor :tags="tags" @change="updateTags" />
        <div class="editor-grid">
          <section class="editor-pane" :class="{ 'mobile-hidden': mobileView !== 'edit' }">
            <div class="editor-toolbar-header">
              <span class="pane-label">Markdown</span>
              <MarkdownToolbar @command="applyMarkdownCommand" />
            </div>
            <textarea
              ref="markdownEditor"
              v-model="content"
              class="markdown-editor"
              :aria-label="t('editor.aria')"
              spellcheck="false"
              :placeholder="t('editor.placeholder')"
              @paste="handleEditorPaste"
              @dragover.prevent
              @drop.prevent="handleEditorDrop"
            />
            <input
              ref="imageInput"
              class="image-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              @change="handleImageInput"
            >
          </section>
          <section class="preview-pane" :class="{ 'mobile-hidden': mobileView !== 'preview' }">
            <div class="pane-label">{{ t('editor.preview') }}</div>
            <MarkdownPreview :content="content" :note-path="notePath" />
          </section>
        </div>
      </template>
      <section v-else class="reader-page">
        <div v-if="tags.length" class="reader-tags" :aria-label="t('editor.noteTags')">
          <span v-for="tag in tags" :key="tag" class="note-tag">{{ tag }}</span>
        </div>
        <MarkdownPreview :content="content" :note-path="notePath" />
        <section class="note-history-section">
          <div class="note-history-heading">
            <div>
              <h2>{{ t('editor.history') }}</h2>
              <p>{{ t('editor.historyDescription') }}</p>
            </div>
            <NuxtLink to="/history" class="history-all-link">{{ t('editor.viewAll') }}</NuxtLink>
          </div>

          <div v-if="historyStatus === 'pending'" class="note-history-message">{{ t('editor.historyLoading') }}</div>
          <div v-else-if="noteHistory.length" class="note-history-list">
            <NuxtLink
              v-for="entry in noteHistory"
              :key="entry.hash"
              :to="`/history/${entry.hash}`"
              class="note-history-item"
            >
              <div>
                <strong>{{ entry.subject }}</strong>
                <span>{{ entry.author }} · {{ formatHistoryDate(entry.committedAt) }}</span>
              </div>
              <div class="note-history-action">
                <code>{{ entry.shortHash }}</code>
                <span aria-hidden="true">→</span>
              </div>
            </NuxtLink>
          </div>
          <div v-else class="note-history-message">{{ t('editor.noHistory') }}</div>
        </section>
      </section>
    </main>

    <DeleteNoteDialog
      :open="deleteDialogOpen"
      :title="title"
      :loading="deleting"
      :error="deleteError"
      @close="deleteDialogOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
