<template>
  <div v-if="tile" class="panel panel--tile-info">
    <div class="panel-header">
      <h3 class="panel-title">{{ getTileTitle(tile) }}</h3>
      <button @click="$emit('close')" class="btn-close">×</button>
    </div>

    <div class="panel-content">
      <div class="tile-info-image">
        <img :src="getTileImage(tile)" :alt="tile.kind" />
      </div>

      <div class="tile-info-details">
        <div class="tile-info-row">
          <span class="label">Type :</span>
          <span class="value">{{ getTileTypeName(tile) }}</span>
        </div>

        <div v-if="tile.coinsChange" class="tile-info-row">
          <span class="label">Pièces :</span>
          <span class="value" :class="{ positive: tile.coinsChange > 0, negative: tile.coinsChange < 0 }">
            {{ tile.coinsChange > 0 ? '+' : '' }}{{ tile.coinsChange }}
          </span>
        </div>

        <div v-if="tile.keyPrice" class="tile-info-row">
          <span class="label">Prix clé :</span>
          <span class="value">{{ tile.keyPrice }} 💰</span>
        </div>

        <div v-if="tile.minigameCategory" class="tile-info-row">
          <span class="label">Mini-jeu :</span>
          <span class="value">{{ tile.minigameCategory }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../../../composables/useBoard'

defineProps<{
  tile: Tile | null
}>()

defineEmits<{
  close: []
}>()

const getTileTitle = (tile: Tile): string => {
  const titles: Record<string, string> = {
    start: '🏁 Case Départ',
    coins: tile.coinsChange && tile.coinsChange > 0 ? '💰 Gain de Pièces' : '💸 Perte de Pièces',
    key_shop: '🔑 Boutique de Clés',
    bonus: '🎁 Case Bonus',
    malus: '⚠️ Case Malus',
    minigame: '🎮 Mini-Jeu',
    empty: '⬜ Case Vide'
  }
  return titles[tile.kind] || 'Case'
}

const getTileImage = (tile: Tile): string => {
  const images: Record<string, string> = {
    start: '/images/tiles/start.png',
    coins: tile.coinsChange && tile.coinsChange > 0 ? '/images/tiles/coins-plus.png' : '/images/tiles/coins-minus.png',
    key_shop: '/images/tiles/key-shop.png',
    bonus: '/images/tiles/bonus.png',
    malus: '/images/tiles/malus.png',
    minigame: '/images/tiles/minigame.png',
    empty: '/images/tiles/empty.png'
  }
  return images[tile.kind] || '/images/tiles/default.png'
}

const getTileTypeName = (tile: Tile): string => {
  const types: Record<string, string> = {
    start: 'Départ',
    coins: 'Pièces',
    key_shop: 'Boutique',
    bonus: 'Bonus',
    malus: 'Malus',
    minigame: 'Mini-jeu',
    empty: 'Vide'
  }
  return types[tile.kind] || 'Inconnu'
}
</script>

<style scoped lang="scss">
.panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &--tile-info {
    animation: slideIn 0.3s ease-out;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}

.btn-close {
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

.panel-content {
  padding: 16px;
}

.tile-info-image {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 12px;

  img {
    max-width: 70px;
    max-height: 70px;
    object-fit: contain;
  }
}

.tile-info-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tile-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;

  .label {
    font-weight: 600;
    color: #6b7280;
  }

  .value {
    font-weight: 600;
    color: #1f2937;

    &.positive {
      color: #10b981;
    }

    &.negative {
      color: #ef4444;
    }
  }
}
</style>
