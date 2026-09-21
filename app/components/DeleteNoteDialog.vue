<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  loading: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @mousedown.self="emit('close')" @keydown.esc="emit('close')">
        <section class="new-note-dialog delete-note-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title">
          <div class="dialog-icon danger-icon" aria-hidden="true">×</div>
          <div class="dialog-heading">
            <h2 id="delete-note-title">删除这篇笔记？</h2>
            <p>“{{ title }}”及其专属图片资源将从笔记目录中删除，并提交一条 Git 删除记录。之后仍可通过 Git 历史恢复。</p>
          </div>

          <p v-if="error" class="dialog-error">{{ error }}</p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" :disabled="loading" @click="emit('close')">取消</button>
            <button type="button" class="danger-button" :disabled="loading" @click="emit('confirm')">
              {{ loading ? '正在删除…' : '确认删除' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
