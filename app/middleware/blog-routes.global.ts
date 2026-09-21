export default defineNuxtRouteMiddleware((to) => {
  const { isBlog } = useAppMode()
  if (isBlog.value && to.path.startsWith('/history')) return navigateTo('/', { replace: true })
})
