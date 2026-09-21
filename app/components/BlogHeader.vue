<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="topbar blog-topbar">
    <AppBrand />
    <nav class="blog-navigation" :aria-label="t('blog.home')">
      <NuxtLink to="/">{{ t('blog.home') }}</NuxtLink>
      <NuxtLink to="/archive">{{ t('blog.archive') }}</NuxtLink>
      <NuxtLink to="/#tags">{{ t('blog.tags') }}</NuxtLink>
      <a href="/rss.xml" target="_blank" rel="noopener noreferrer">{{ t('blog.rss') }}</a>
    </nav>
    <div class="topbar-actions">
      <LanguageSelector />
      <ThemeToggle />
    </div>
  </header>
</template>
