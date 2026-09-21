export type AppMode = 'notes' | 'blog'

export function useAppMode() {
  const config = useRuntimeConfig()
  const mode = computed<AppMode>(() => String(config.public.appMode).toLowerCase() === 'blog' ? 'blog' : 'notes')
  const isBlog = computed(() => mode.value === 'blog')
  return { mode, isBlog }
}
