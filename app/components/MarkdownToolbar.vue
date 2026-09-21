<script setup lang="ts">
import type { MarkdownCommand } from '~~/shared/types/editor'

const emit = defineEmits<{
  command: [command: MarkdownCommand]
}>()

const { t } = useI18n()
const tools = computed<Array<{ command: MarkdownCommand, label: string, title: string, style?: string }>>(() => [
  { command: 'heading-one', label: 'H1', title: t('toolbar.headingOne') },
  { command: 'heading-two', label: 'H2', title: t('toolbar.headingTwo') },
  { command: 'bold', label: 'B', title: t('toolbar.bold'), style: 'font-weight: 800' },
  { command: 'italic', label: 'I', title: t('toolbar.italic'), style: 'font-style: italic' },
  { command: 'strike', label: 'S', title: t('toolbar.strike'), style: 'text-decoration: line-through' },
  { command: 'link', label: t('toolbar.link'), title: t('toolbar.insertLink') },
  { command: 'quote', label: t('toolbar.quote'), title: t('toolbar.quoteTitle') },
  { command: 'bullet-list', label: t('toolbar.bulletList'), title: t('toolbar.bulletListTitle') },
  { command: 'numbered-list', label: t('toolbar.numberedList'), title: t('toolbar.numberedListTitle') },
  { command: 'task-list', label: t('toolbar.taskList'), title: t('toolbar.taskListTitle') },
  { command: 'image', label: t('toolbar.image'), title: t('toolbar.imageTitle') },
  { command: 'inline-code', label: '</>', title: t('toolbar.inlineCode') },
  { command: 'code-block', label: '{ }', title: t('toolbar.codeBlock') },
])
</script>

<template>
  <div class="markdown-toolbar" role="toolbar" :aria-label="t('toolbar.label')">
    <button
      v-for="tool in tools"
      :key="tool.command"
      type="button"
      class="toolbar-button"
      :title="tool.title"
      :aria-label="tool.title"
      :style="tool.style"
      @mousedown.prevent="emit('command', tool.command)"
    >
      {{ tool.label }}
    </button>
  </div>
</template>
