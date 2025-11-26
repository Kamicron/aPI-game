<template>
  <div class="lobby-card">
    <h2 class="lobby-card__title">{{ title }}</h2>
    <div class="lobby-card__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang='ts'>
const props = defineProps<{ title: string }>()
</script>

<style lang='scss' scoped>
.lobby-card {
  background: var(--apg-surface);
  border-radius: $apg-radius-lg;
  box-shadow: var(--apg-shadow-soft);

  &__title {
    font-size: $apg-font-size-2xl;
    font-weight: $apg-font-weight-bold;
    color: var(--apg-text-main);
  }
}
</style>