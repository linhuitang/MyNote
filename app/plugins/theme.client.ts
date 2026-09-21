export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => useTheme().initialiseTheme())
})
