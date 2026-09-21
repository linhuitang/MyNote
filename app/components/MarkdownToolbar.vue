<script setup lang="ts">
import type { MarkdownCommand } from '~~/shared/types/editor'

const emit = defineEmits<{
  command: [command: MarkdownCommand]
}>()

const tools: Array<{ command: MarkdownCommand, label: string, title: string, style?: string }> = [
  { command: 'heading-one', label: 'H1', title: '一级标题' },
  { command: 'heading-two', label: 'H2', title: '二级标题' },
  { command: 'bold', label: 'B', title: '粗体', style: 'font-weight: 800' },
  { command: 'italic', label: 'I', title: '斜体', style: 'font-style: italic' },
  { command: 'strike', label: 'S', title: '删除线', style: 'text-decoration: line-through' },
  { command: 'link', label: '链接', title: '插入链接' },
  { command: 'quote', label: '引用', title: '引用段落' },
  { command: 'bullet-list', label: '• 列表', title: '无序列表' },
  { command: 'numbered-list', label: '1. 列表', title: '有序列表' },
  { command: 'task-list', label: '☐ 任务', title: '任务列表' },
  { command: 'image', label: '图片', title: '插入图片' },
  { command: 'inline-code', label: '</>', title: '行内代码' },
  { command: 'code-block', label: '{ }', title: '代码块' },
]
</script>

<template>
  <div class="markdown-toolbar" role="toolbar" aria-label="Markdown 格式工具">
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
