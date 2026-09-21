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

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="open" class="dialog-backdrop" @mousedown.self="emit('close')" @keydown.esc="emit('close')">
        <section class="new-note-dialog delete-note-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title">
          <div class="dialog-icon danger-icon" aria-hidden="true">×</div>
          <div class="dialog-heading">
            <h2 id="delete-note-title">{{ t('delete.title') }}</h2>
            <p>{{ t('delete.description', { title }) }}</p>
          </div>

          <p v-if="error" class="dialog-error">{{ error }}</p>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" :disabled="loading" @click="emit('close')">{{ t('common.cancel') }}</button>
            <button type="button" class="danger-button" :disabled="loading" @click="emit('confirm')">
              {{ loading ? t('delete.deleting') : t('delete.confirm') }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
