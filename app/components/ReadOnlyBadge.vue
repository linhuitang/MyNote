<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <span class="read-only-badge" :title="t('readOnly.description')">
    {{ t('readOnly.label') }}
  </span>
</template>
