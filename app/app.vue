<script setup lang="ts">
const { resolvedTheme } = useTheme()
const { locale } = useI18n()

useHead(() => ({
  htmlAttrs: { lang: locale.value },
  meta: [
    { name: 'color-scheme', content: 'light dark' },
    { name: 'theme-color', content: resolvedTheme.value === 'dark' ? '#191918' : '#f7f7f3' },
  ],
}))
</script>

<template>
  <NuxtPage />
</template>
