<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="topbar blog-topbar">
    <AppBrand />
    <nav class="blog-navigation" :aria-label="t('blog.home')">
      <NuxtLink to="/">{{ t('blog.home') }}</NuxtLink>
      <NuxtLink to="/#posts">{{ t('blog.archive') }}</NuxtLink>
      <NuxtLink to="/#tags">{{ t('blog.tags') }}</NuxtLink>
    </nav>
    <div class="topbar-actions">
      <LanguageSelector />
      <ThemeToggle />
    </div>
  </header>
</template>
