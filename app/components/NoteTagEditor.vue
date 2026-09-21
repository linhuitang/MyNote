<script setup lang="ts">
import { normaliseTags } from '~~/shared/utils/markdown-metadata'

const props = defineProps<{ tags: string[] }>()
const emit = defineEmits<{ change: [tags: string[]] }>()
const draft = ref('')

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
    <span class="note-tag-editor-label">标签</span>
    <div class="note-tag-editor-values">
      <button
        v-for="tag in tags"
        :key="tag"
        type="button"
        class="note-tag removable"
        :aria-label="`移除标签 ${tag}`"
        @click="removeTag(tag)"
      >
        {{ tag }} <span aria-hidden="true">×</span>
      </button>
      <input
        v-model="draft"
        type="text"
        maxlength="80"
        placeholder="输入标签，回车添加"
        aria-label="添加笔记标签"
        @keydown.enter.prevent="addTags"
        @blur="addTags"
      >
    </div>
    <button v-if="draft.trim()" type="button" class="tag-add-button" @mousedown.prevent @click="addTags">添加</button>
  </div>
</template>
