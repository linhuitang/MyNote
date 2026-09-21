<script setup lang="ts">
import { normaliseTags } from '~~/shared/utils/markdown-metadata'

const props = defineProps<{ tags: string[] }>()
const emit = defineEmits<{ change: [tags: string[]] }>()
const draft = ref('')
const { t } = useI18n()

function addTags(): void {
  const values = draft.value.split(/[,，]/)
  const nextTags = normaliseTags([...props.tags, ...values])
  if (nextTags.length !== props.tags.length) emit('change', nextTags)
  draft.value = ''
}

function removeTag(tag: string): void {
  emit('change', props.tags.filter(item => item !== tag))
}
</script>

<template>
  <div class="note-tag-editor">
    <span class="note-tag-editor-label">{{ t('tags.label') }}</span>
    <div class="note-tag-editor-values">
      <button
        v-for="tag in tags"
        :key="tag"
        type="button"
        class="note-tag removable"
        :aria-label="t('tags.remove', { tag })"
        @click="removeTag(tag)"
      >
        {{ tag }} <span aria-hidden="true">×</span>
      </button>
      <input
        v-model="draft"
        type="text"
        maxlength="80"
        :placeholder="t('tags.placeholder')"
        :aria-label="t('tags.addLabel')"
        @keydown.enter.prevent="addTags"
        @blur="addTags"
      >
    </div>
    <button v-if="draft.trim()" type="button" class="tag-add-button" @mousedown.prevent @click="addTags">{{ t('common.add') }}</button>
  </div>
</template>
