export function useReadOnly() {
  const config = useRuntimeConfig()
  return computed(() => ['true', '1', 'yes', 'on'].includes(String(config.public.readOnly).toLowerCase()))
}
