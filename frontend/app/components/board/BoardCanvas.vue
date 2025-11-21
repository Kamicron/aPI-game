<template>
  <div class="board-canvas">
    <svg class="board-canvas__links" :viewBox="`0 0 ${size} ${size}`">
      <g stroke="#999" stroke-width="2">
        <line v-for="(connection, index) in connections" :key="index" :x1="connection.x1" :y1="connection.y1"
          :x2="connection.x2" :y2="connection.y2" />
      </g>
    </svg>

    <BoardTile v-for="tile in board.tiles" :key="tile.id" :tile="tile" :left="offset + tile.x * tileSize"
      :top="offset + tile.y * tileSize" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Board, Tile } from '../../../../composables/useBoard'
import BoardTile from './BoardTile.vue'

const props = defineProps<{
  board: Board
}>()

const size = 600
const tileSize = 32
const offset = 40

const tileById = computed<Record<number, Tile>>(() => {
  const map: Record<number, Tile> = {}
  for (const tile of props.board.tiles) {
    map[tile.id] = tile
  }
  return map
})

const connections = computed(() => {
  const result: { x1: number; y1: number; x2: number; y2: number }[] = []

  for (const tile of props.board.tiles) {
    for (const targetId of tile.next) {
      const target = tileById.value[targetId]
      if (!target) continue

      result.push({
        x1: offset + tile.x * tileSize,
        y1: offset + tile.y * tileSize,
        x2: offset + target.x * tileSize,
        y2: offset + target.y * tileSize,
      })
    }
  }

  return result
})
</script>

<style scoped lang="scss">
.board-canvas {
  position: relative;
  width: 600px;
  height: 600px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f5f5f5;
  margin: 16px 0;
}

.board-canvas__links {
  position: absolute;
  inset: 0;
}
</style>
