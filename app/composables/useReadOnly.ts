export function useReadOnly() {
  const config = useRuntimeConfig()
  const { isBlog } = useAppMode()
  return computed(() => isBlog.value || ['true', '1', 'yes', 'on'].includes(String(config.public.readOnly).toLowerCase()))
}
