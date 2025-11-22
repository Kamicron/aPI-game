<template>
  <div class="board-canvas-wrapper">
    <div class="board-canvas-controls">
      <button @click="zoomIn" class="zoom-btn" title="Zoom avant">+</button>
      <button @click="resetZoom" class="zoom-btn" title="Réinitialiser">⟲</button>
      <button @click="zoomOut" class="zoom-btn" title="Zoom arrière">−</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
    </div>
    
    <div class="board-layout">
      <div 
        class="board-canvas-container" 
        @wheel.prevent="handleWheel"
        @mousedown="startPan"
        @mousemove="handlePan"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <div 
          class="board-canvas" 
          :style="canvasStyle"
        >
          <BoardTile 
            v-for="tile in board.tiles" 
            :key="tile.id" 
            :tile="tile" 
            :left="offset + tile.x * tileSize"
            :top="offset + tile.y * tileSize"
            @click="focusTile"
          />
        </div>
      </div>

      <!-- Panneau d'information de la tuile -->
      <div v-if="selectedTile" class="tile-info-panel">
        <div class="tile-info-header">
          <h3>{{ getTileTitle(selectedTile) }}</h3>
          <button @click="selectedTile = null" class="close-btn">×</button>
        </div>
        
        <div class="tile-info-content">
          <div class="tile-info-image">
            <img :src="getTileImage(selectedTile)" :alt="selectedTile.kind" />
          </div>
          
          <div class="tile-info-details">
            <div class="tile-info-row">
              <span class="label">Type :</span>
              <span class="value">{{ getTileTypeName(selectedTile) }}</span>
            </div>
            
            <div v-if="selectedTile.coinsChange" class="tile-info-row">
              <span class="label">Pièces :</span>
              <span class="value" :class="selectedTile.coinsChange > 0 ? 'positive' : 'negative'">
                {{ selectedTile.coinsChange > 0 ? '+' : '' }}{{ selectedTile.coinsChange }}
              </span>
            </div>
            
            <div v-if="selectedTile.keyPrice" class="tile-info-row">
              <span class="label">Prix :</span>
              <span class="value">{{ selectedTile.keyPrice }} pièces</span>
            </div>
            
            <div class="tile-info-description">
              {{ getTileDescription(selectedTile) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Board, Tile } from '../../../../composables/useBoard';
import BoardTile from './BoardTile.vue';

const props = defineProps<{
  board: Board
}>()

const size = 600
const tileSize = 64
const offset = 40

// Zoom et pan
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

// Tuile sélectionnée
const selectedTile = ref<Tile | null>(null)

const canvasStyle = computed(() => ({
  transform: `scale(${zoom.value}) translate(${panX.value}px, ${panY.value}px)`,
  transformOrigin: 'top left',
  transition: isPanning.value ? 'none' : 'transform 0.2s ease-out',
}))

// Fonctions de zoom
const zoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.2, 3)
}

const zoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.2, 0.5)
}

const resetZoom = () => {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

// Zoom avec la molette (centré sur la position de la souris)
const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.5, Math.min(3, zoom.value + delta))
  
  // Position de la souris par rapport au container
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  // Calculer le point sous la souris avant le zoom
  const pointX = (mouseX - panX.value * zoom.value) / zoom.value
  const pointY = (mouseY - panY.value * zoom.value) / zoom.value
  
  // Ajuster le pan pour que le point reste sous la souris après le zoom
  panX.value = (mouseX - pointX * newZoom) / newZoom
  panY.value = (mouseY - pointY * newZoom) / newZoom
  
  zoom.value = newZoom
}

// Pan avec la souris
const startPan = (e: MouseEvent) => {
  isPanning.value = true
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
}

const handlePan = (e: MouseEvent) => {
  if (!isPanning.value) return
  
  const deltaX = e.clientX - lastMouseX.value
  const deltaY = e.clientY - lastMouseY.value
  
  panX.value += deltaX / zoom.value
  panY.value += deltaY / zoom.value
  
  lastMouseX.value = e.clientX
  lastMouseY.value = e.clientY
}

const endPan = () => {
  isPanning.value = false
}

// Centrer et zoomer sur une tuile
const focusTile = (tile: Tile, x: number, y: number) => {
  // Empêcher le focus si on est en train de déplacer
  if (isPanning.value) return
  
  // Sélectionner la tuile
  selectedTile.value = tile
  
  // Position de la tuile dans le canvas
  const tileCenterX = offset + x * tileSize + tileSize / 2
  const tileCenterY = offset + y * tileSize + tileSize / 2
  
  // Zoomer à 2x
  const targetZoom = 2
  
  // Centre du container
  const containerCenterX = 400
  const containerCenterY = 400
  
  // Calculer le pan pour centrer la tuile
  panX.value = (containerCenterX - tileCenterX * targetZoom) / targetZoom
  panY.value = (containerCenterY - tileCenterY * targetZoom) / targetZoom
  
  zoom.value = targetZoom
}

// Fonctions helper pour les infos de tuile
const getTileTitle = (tile: Tile) => {
  const titles: Record<string, string> = {
    start: '🏁 Case Départ',
    coins: '💰 Case Pièces',
    minigame: '🎮 Mini-Jeu',
    key_shop: '🔑 Boutique de Clés',
    bonus: '⭐ Case Bonus',
    malus: '💀 Case Piège',
  }
  return titles[tile.kind] || 'Case'
}

const getTileTypeName = (tile: Tile) => {
  const names: Record<string, string> = {
    start: 'Départ',
    coins: 'Pièces',
    minigame: 'Mini-Jeu',
    key_shop: 'Boutique',
    bonus: 'Bonus',
    malus: 'Piège',
  }
  return names[tile.kind] || tile.kind
}

const getTileImage = (tile: Tile) => {
  const baseUrl = '/assets/tiles/'
  const images: Record<string, string> = {
    start: 'tile_start.png',
    coins: 'tile_coin.png',
    minigame: 'tile_games.png',
    key_shop: 'tile_key.png',
    bonus: 'tile_bonus.png',
    malus: 'tile_trap.png',
  }
  return baseUrl + (images[tile.kind] || 'tile_coin.png')
}

const getTileDescription = (tile: Tile) => {
  const descriptions: Record<string, string> = {
    start: 'Point de départ de tous les joueurs. Passez par ici pour recevoir des pièces bonus !',
    coins: 'Gagnez ou perdez des pièces en tombant sur cette case.',
    minigame: 'Participez à un mini-jeu pour gagner des pièces et des récompenses !',
    key_shop: 'Achetez une clé pour débloquer des zones spéciales du plateau.',
    bonus: 'Recevez un bonus surprise ! Cela peut être des pièces, des objets ou des avantages.',
    malus: 'Attention ! Cette case peut vous faire perdre des pièces ou des avantages.',
  }
  return descriptions[tile.kind] || 'Une case mystérieuse...'
}
</script>

<style scoped lang="scss">
.board-canvas-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.board-canvas-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
  width: fit-content;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #999;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f0f0f0;
    border-color: #666;
  }

  &:active {
    background: #e0e0e0;
  }
}

.zoom-level {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  min-width: 50px;
  text-align: center;
}

.board-canvas-container {
  position: relative;
  width: 800px;
  height: 800px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #f5f5f5;
  overflow: hidden;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.board-canvas {
  position: relative;
  width: 800px;
  height: 800px;
}

.board-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.tile-info-panel {
  width: 320px;
  background: #fff;
  border: 2px solid #4CAF50;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.tile-info-header {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.tile-info-content {
  padding: 16px;
}

.tile-info-image {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;

  img {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
  }
}

.tile-info-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tile-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f9f9f9;
  border-radius: 6px;

  .label {
    font-weight: 600;
    color: #666;
    font-size: 14px;
  }

  .value {
    font-weight: 700;
    font-size: 16px;
    color: #333;

    &.positive {
      color: #4CAF50;
    }

    &.negative {
      color: #f44336;
    }
  }
}

.tile-info-description {
  padding: 12px;
  background: #e8f5e9;
  border-left: 3px solid #4CAF50;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
  margin-top: 8px;
}
</style>
