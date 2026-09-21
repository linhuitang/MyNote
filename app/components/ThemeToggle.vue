<script setup lang="ts">
import type { ThemePreference } from '~/composables/useTheme'

const { preference, resolvedTheme, setTheme } = useTheme()
const open = ref(false)
const root = useTemplateRef<HTMLElement>('themeControl')

const options: Array<{ value: ThemePreference, label: string, icon: string }> = [
  { value: 'light', label: '浅色', icon: '☀' },
  { value: 'dark', label: '深色', icon: '☾' },
  { value: 'system', label: '跟随系统', icon: '◐' },
]

const currentLabel = computed(() => options.find(option => option.value === preference.value)?.label || '主题')

function chooseTheme(value: ThemePreference): void {
  setTheme(value)
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
  <div ref="themeControl" class="theme-control">
    <button
      type="button"
      class="theme-toggle"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="`切换主题，当前为${currentLabel}`"
      :title="`主题：${currentLabel}`"
      @click="open = !open"
    >
      <span class="theme-toggle-icon" aria-hidden="true">{{ resolvedTheme === 'dark' ? '☾' : '☀' }}</span>
      <span class="theme-toggle-label">主题</span>
      <svg class="theme-toggle-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Transition name="theme-menu">
      <div v-if="open" class="theme-menu" role="menu" aria-label="选择页面主题">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="menuitemradio"
          :aria-checked="preference === option.value"
          :class="{ active: preference === option.value }"
          @click="chooseTheme(option.value)"
        >
          <span class="theme-option-icon" aria-hidden="true">{{ option.icon }}</span>
          <span>{{ option.label }}</span>
          <span class="theme-option-check" aria-hidden="true">{{ preference === option.value ? '✓' : '' }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
