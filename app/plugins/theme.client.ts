export default defineNuxtPlugin(() => {
  const { initialiseTheme } = useTheme()
  initialiseTheme()
})
