import { defineNuxtPlugin } from '#app'
import VueToast, { createToast, ETextOverflow, EToast } from 'vue3-modern-toast'
import 'vue3-modern-toast/dist/style.css'

declare module '#app' {
  interface NuxtApp {
    $toast: ReturnType<typeof createToast>
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueToast)

  const toast = createToast()

  // Configuration globale, basée sur les variables CSS du thème
  toast.configure({
    position: {
      top: 100,
      right: 24,
    },
    styles: {
      fontFamily: 'var(--apg-font-sans)',
      fontSize: 'var(--apg-font-size-sm)',
      borderRadius: 'var(--apg-radius-lg)',
      boxShadow: 'var(--apg-shadow-soft)',
      width: '320px',
      maxHeight: '120px',
      textOverflow: ETextOverflow.ELLIPSIS,
      types: {
        [EToast.SUCCESS]: {
          backgroundColor: 'transparent',
          color: 'inherit',
          borderColor: 'var(--apg-success)',
        },
        [EToast.ERROR]: {
          backgroundColor: 'transparent',
          color: 'inherit',
          borderColor: 'var(--apg-danger)',
        },
        [EToast.WARNING]: {
          backgroundColor: 'transparent',
          color: 'inherit',
          borderColor: 'var(--apg-warning)',
        },
        [EToast.INFO]: {
          backgroundColor: 'transparent',
          color: 'inherit',
          borderColor: 'var(--apg-primary)',
        },
      },
    },
  })

  return {
    provide: {
      toast
    }
  }
})