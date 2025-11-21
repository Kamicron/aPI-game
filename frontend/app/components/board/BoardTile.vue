<template>
  <div class="board-tile" :class="`board-tile--${tile.kind}`" :style="styleObject">
    <span class="board-tile__label">{{ tileLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../../../../composables/useBoard'

const props = defineProps<{
  tile: Tile
  left: number
  top: number
}>()

const styleObject = computed(() => ({
  left: `${props.left}px`,
  top: `${props.top}px`,
}))

const tileLabel = computed(() => {
  if (props.tile.kind === 'start') return 'S'
  if (props.tile.kind === 'coins') return `+${props.tile.coinsChange ?? ''}`
  if (props.tile.kind === 'malus') return `${props.tile.coinsChange ?? ''}`
  if (props.tile.kind === 'key_shop') return 'K'
  if (props.tile.kind === 'minigame') return 'M'
  if (props.tile.kind === 'bonus') return 'B'
  return ''
})
</script>

<style scoped lang="scss">
.board-tile {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #000;
  border: 1px solid #333;
  background: #fff;
}

.board-tile--start {
  background: #ffeb3b;
}

.board-tile--coins {
  background: #ffd54f;
}

.board-tile--minigame {
  background: #4fc3f7;
}

.board-tile--key_shop {
  background: #ce93d8;
}

.board-tile--bonus {
  background: #a5d6a7;
}

.board-tile--malus {
  background: #ef9a9a;
}

.board-tile__label {
  font-weight: 600;
}
</style>
