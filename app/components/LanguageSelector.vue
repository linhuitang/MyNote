<script setup lang="ts">
import type { AppLocale } from '~/composables/useI18n'

const { locale, locales, t, setLocale } = useI18n()
const open = ref(false)
const root = useTemplateRef<HTMLElement>('languageControl')

const currentLocale = computed(() => locales.find(option => option.code === locale.value) || locales[0])

function chooseLocale(value: AppLocale): void {
  setLocale(value)
  open.value = false
}

function handlePointerDown(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node)) open.value = false
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="languageControl" class="language-control">
    <button
      type="button"
      class="language-toggle"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('language.current', { language: currentLocale.label })"
      :title="t('language.current', { language: currentLocale.label })"
      @click="open = !open"
    >
      <span class="language-toggle-icon" aria-hidden="true">文</span>
      <span class="language-toggle-label">{{ currentLocale.shortLabel }}</span>
      <svg class="language-toggle-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Transition name="theme-menu">
      <div v-if="open" class="language-menu" role="menu" :aria-label="t('language.menu')">
        <button
          v-for="option in locales"
          :key="option.code"
          type="button"
          role="menuitemradio"
          :aria-checked="locale === option.code"
          :class="{ active: locale === option.code }"
          @click="chooseLocale(option.code)"
        >
          <span>{{ option.label }}</span>
          <span class="language-option-check" aria-hidden="true">{{ locale === option.code ? '✓' : '' }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
