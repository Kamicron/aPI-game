<template>
  <div class="board-tile" :style="styleObject" @click="handleClick">
    <img 
      :src="tileImage" 
      :alt="tile.kind" 
      class="board-tile__image" 
      draggable="false"
    />
    <span v-if="tileLabel" class="board-tile__label">{{ tileLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../../../../composables/useBoard';

const props = defineProps<{
  tile: Tile
  left: number
  top: number
}>()

const emit = defineEmits<{
  click: [tile: Tile, x: number, y: number]
}>()

const styleObject = computed(() => ({
  left: `${props.left}px`,
  top: `${props.top}px`,
}))

const tileImage = computed(() => {
  const baseUrl = '/assets/tiles/'
  switch (props.tile.kind) {
    case 'start':
      return `${baseUrl}tile_start.png`
    case 'coins':
      return `${baseUrl}tile_coin.png`
    case 'minigame':
      return `${baseUrl}tile_games.png`
    case 'key_shop':
      return `${baseUrl}tile_key.png`
    case 'bonus':
      return `${baseUrl}tile_bonus.png`
    case 'malus':
      return `${baseUrl}tile_trap.png`
    default:
      return `${baseUrl}tile_coin.png`
  }
})

const tileLabel = computed(() => {
  // Afficher les valeurs numériques pour coins/malus
  if (props.tile.kind === 'coins') return `+${props.tile.coinsChange ?? ''}`
  if (props.tile.kind === 'malus') return `${props.tile.coinsChange ?? ''}`
  return ''
})

const handleClick = () => {
  emit('click', props.tile, props.tile.x, props.tile.y)
}
</script>

<style scoped lang="scss">
.board-tile {
  position: absolute;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
    z-index: 10;
  }
}

.board-tile__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
  pointer-events: none;
}

.board-tile__label {
  position: relative;
  z-index: 1;
  font-weight: 700;
  font-size: 11px;
  color: #fff;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  pointer-events: none;
}
</style>
