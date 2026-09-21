<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  create: [title: string]
}>()

const title = ref('')
const titleInput = useTemplateRef<HTMLInputElement>('titleInput')
const { t } = useI18n()

const suggestedFilename = computed(() => {
  const slug = title.value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || t('new.untitled')}.md`
})

watch(() => props.open, async (open) => {
  if (!open) return
  title.value = ''
  await nextTick()
  titleInput.value?.focus()
})

function close(): void {
  emit('close')
}

function submit(): void {
  const value = title.value.trim()
  if (!value) {
    titleInput.value?.focus()
    return
  }
  emit('create', value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @mousedown.self="close" @keydown.esc="close">
        <section class="new-note-dialog" role="dialog" aria-modal="true" aria-labelledby="new-note-title">
          <!-- <div class="dialog-icon" aria-hidden="true">+</div> -->
          <div class="dialog-heading">
            <h2 id="new-note-title">{{ t('new.title') }}</h2>
            <p>{{ t('new.description') }}</p>
          </div>

          <form @submit.prevent="submit">
            <label class="field-label" for="note-title-input">{{ t('new.noteTitle') }}</label>
            <input
              id="note-title-input"
              ref="titleInput"
              v-model="title"
              class="title-input"
              type="text"
              maxlength="120"
              autocomplete="off"
              :placeholder="t('new.placeholder')"
            >
            <p class="filename-preview">
              <span>{{ t('new.filename') }}</span>
              <code>{{ suggestedFilename }}</code>
            </p>

            <div class="dialog-actions">
              <button type="button" class="secondary-button" @click="close">{{ t('common.cancel') }}</button>
              <button type="submit" class="primary-button" :disabled="!title.trim()">{{ t('new.create') }}</button>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
