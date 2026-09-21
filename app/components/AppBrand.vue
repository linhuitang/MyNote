<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <NuxtLink to="/" class="brand-group" aria-label="返回笔记首页">
    <img class="brand-mark" src="/mynote-logo.png" alt="">
    <span>
      <strong class="brand-name">{{ config.public.appName }}</strong>
      <span class="brand-caption">Markdown notes, kept in Git</span>
    </span>
  </NuxtLink>
</template>
