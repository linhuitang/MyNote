<script setup lang="ts">
const { locale, t, setLocale } = useI18n()

function toggleLocale(): void {
  setLocale(locale.value === 'en' ? 'zh-CN' : 'en')
}
</script>

<template>
  <button
    type="button"
    class="language-toggle"
    :aria-label="t('language.switchTo')"
    :title="t('language.switchTo')"
    @click="toggleLocale"
  >
    <span aria-hidden="true">文</span>
    <span>{{ locale === 'en' ? 'EN' : '中' }}</span>
  </button>
</template>
