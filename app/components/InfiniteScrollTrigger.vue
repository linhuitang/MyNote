<script setup lang="ts">
const props = defineProps<{
  hasMore: boolean
  loading: boolean
  label?: string
}>()

const emit = defineEmits<{ load: [] }>()
const trigger = useTemplateRef<HTMLElement>('trigger')
let observer: IntersectionObserver | undefined
let requestPending = false

function requestMore(): void {
  if (!props.hasMore || props.loading || requestPending) return
  requestPending = true
  emit('load')
  queueMicrotask(() => {
    if (!props.loading) requestPending = false
  })
}

function checkPosition(): void {
  const element = trigger.value
  if (!element) return
  if (element.getBoundingClientRect().top <= window.innerHeight + 320) requestMore()
}

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) requestMore()
  }, { rootMargin: '320px 0px' })

  if (trigger.value) observer.observe(trigger.value)
})

watch(trigger, (element, previous) => {
  if (previous) observer?.unobserve(previous)
  if (element) observer?.observe(element)
})

watch(() => props.loading, (loading, wasLoading) => {
  if (!loading && wasLoading) {
    requestPending = false
    nextTick(checkPosition)
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div v-if="hasMore || loading" ref="trigger" class="infinite-scroll-trigger" aria-live="polite">
    {{ loading ? (label || '正在加载更多…') : '' }}
  </div>
  <div v-else class="infinite-scroll-end">已经到底了</div>
</template>
