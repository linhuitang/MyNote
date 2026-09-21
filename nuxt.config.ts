export default defineNuxtConfig({
  compatibilityDate: '2026-09-21',
  devtools: { enabled: false },
  ssr: true,
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  runtimeConfig: {
    notesDirectory: './notes',
    public: {
      appName: 'MyNote',
      appMode: 'notes',
      blogDescription: 'A Git-powered Markdown blog.',
      siteUrl: '',
      readOnly: false,
    },
  },
})
