<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  close: []
  create: [title: string]
}>()

const title = ref('')
const titleInput = useTemplateRef<HTMLInputElement>('titleInput')

const suggestedFilename = computed(() => {
  const slug = title.value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || '未命名笔记'}.md`
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
            <h2 id="new-note-title">新建笔记</h2>
            <p>输入标题后进入编辑页面，笔记在点击保存前不会写入磁盘。</p>
          </div>

          <form @submit.prevent="submit">
            <label class="field-label" for="note-title-input">笔记标题</label>
            <input
              id="note-title-input"
              ref="titleInput"
              v-model="title"
              class="title-input"
              type="text"
              maxlength="120"
              autocomplete="off"
              placeholder="例如：下周工作计划"
            >
            <p class="filename-preview">
              <span>文件名</span>
              <code>{{ suggestedFilename }}</code>
            </p>

            <div class="dialog-actions">
              <button type="button" class="secondary-button" @click="close">取消</button>
              <button type="submit" class="primary-button" :disabled="!title.trim()">创建并编辑</button>
            </div>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
