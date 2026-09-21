export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => useI18n().initialiseLocale())
})
