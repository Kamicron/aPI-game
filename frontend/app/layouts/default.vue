<template>
  <div class="apg-layout" :data-theme="currentTheme">
    <header class="apg-header">
      <div class="apg-header-left">
        <span class="apg-logo">aPI-game</span>
      </div>
      <nav class="apg-nav">
        <NuxtLink to="/" class="apg-nav-link">Accueil</NuxtLink>
        <NuxtLink to="/lobby" class="apg-nav-link">Lobby</NuxtLink>
      </nav>
      <div class="apg-header-right">
        <button type="button" class="apg-theme-toggle" @click="toggleTheme">
          <span v-if="currentTheme === 'light'">🌙 Dark</span>
          <span v-else>☀️ Light</span>
        </button>
      </div>
    </header>

    <main class="apg-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '../composables/useTheme';

const { currentTheme, toggleTheme } = useTheme()
</script>

<style scoped lang="scss">
@use "../assets/variables.scss" as *;

.apg-layout {
  min-height: 100vh;
  background: var(--apg-bg);
  color: var(--apg-text-main);
  transition: background-color 250ms ease, color 250ms ease;
}

html[data-theme='dark'] .apg-layout {
  background: #050816;
  color: #e5e7eb;
}

.apg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
}

.apg-logo {
  font-family: $apg-font-family-title;
  font-size: 24px;
}

.apg-nav {
  display: flex;
  gap: 16px;
}

.apg-nav-link {
  text-decoration: none;
  color: inherit;
  font-weight: 500;
}

.apg-header-right {
  display: flex;
  align-items: center;
}

.apg-theme-toggle {
  padding: 8px 14px;
  border-radius: $apg-radius-pill;
  border: 1px solid var(--apg-border-subtle);
  background: rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}
</style>
