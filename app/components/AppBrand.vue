<script setup lang="ts">
const config = useRuntimeConfig()
const { t } = useI18n()
</script>

<template>
  <NuxtLink to="/" class="brand-group" :aria-label="t('brand.home')">
    <img class="brand-mark" src="/mynote-logo.png" alt="">
    <span>
      <strong class="brand-name">{{ config.public.appName }}</strong>
      <span class="brand-caption">{{ t('brand.caption') }}</span>
    </span>
  </NuxtLink>
</template>
