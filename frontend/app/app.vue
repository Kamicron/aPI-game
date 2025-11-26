<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang="scss">
@use "./assets/variables.scss" as *;
@use "./assets/components.scss" as *;
@import "./assets/reset.css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap');

:root,
body,
.apg-layout,
.lobby-card,
button,
input,
textarea {
  transition: background-color 250ms ease, color 250ms ease,
    border-color 250ms ease, box-shadow 250ms ease;
}

:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.panel-title {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* -----------------------------
   Toast (vue3-modern-toast)
   ----------------------------- */
body .toast {
  padding: $apg-margin-md $apg-margin-lg !important;
  background: var(--apg-surface-alt) !important;
  color: var(--apg-text-main) !important;
  box-shadow: var(--apg-shadow-soft) !important;
}

body .toast-content {
  display: flex;
  align-items: flex-start;
  gap: $apg-margin-sm;
}

body .toast-icon {
  flex-shrink: 0;
}

body .toast-message {
  font-size: $apg-font-size-sm;
}

body .toast-close {
  position: absolute;
  right: -4px;
  top: -4px;
  background: transparent;
  border: none;
  color: var(--apg-text-soft);
  font-size: 18px;
  cursor: pointer;
  padding: 0 $apg-margin-sm;
  opacity: 0.7;
  transition: opacity 0.2s ease, transform 0.1s ease;

  &:hover {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Animations d'apparition / disparition */
body .toast-enter-active,
body .toast-leave-active {
  transition: all 0.25s ease;
}

body .toast-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

body .toast-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
