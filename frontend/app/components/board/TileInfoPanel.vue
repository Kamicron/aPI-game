<template>
  <div v-if="tile" class="panel panel--tile-info">
    <div class="panel-header">
      <h3 class="panel-title">{{ getTileTitle(tile) }}</h3>
      <button @click="$emit('close')" class="btn-close">×</button>
    </div>

    <div class="panel-content">
      <div class="tile-overview">
        <div class="tile-icon-wrap">
          <img :src="getTileImage(tile)" :alt="tile.kind" />
        </div>

        <div class="tile-tags">
          <div class="tag-row">
            <span class="tag-label">Type</span>
            <span class="tag-value">{{ getTileTypeName(tile) }}</span>
          </div>

          <div v-if="tile.coinsChange" class="tag-row">
            <span class="tag-label">Pièces</span>
            <span class="tag-value" :class="{ positive: tile.coinsChange > 0, negative: tile.coinsChange < 0 }">
              {{ tile.coinsChange > 0 ? '+' : '' }}{{ tile.coinsChange }}
            </span>
          </div>

          <div v-if="tile.keyPrice" class="tag-row">
            <span class="tag-label">Prix clé</span>
            <span class="tag-value">{{ tile.keyPrice }} 💰</span>
          </div>

          <div v-if="tile.minigameCategory" class="tag-row">
            <span class="tag-label">Mini-jeu</span>
            <span class="tag-value">{{ tile.minigameCategory }}</span>
          </div>
        </div>
      </div>

      <p class="tile-description">{{ getTileDescription(tile) }}</p>

      <div v-if="playersOnTile && playersOnTile.length" class="players-section">
        <div class="players-title">Joueurs présents</div>
        <div class="players-chips">
          <span v-for="player in playersOnTile" :key="player.id" class="player-chip">
            <span class="player-dot" :style="{ backgroundColor: player.color }"></span>
            <span class="player-name">{{ player.name }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tile } from '../../../composables/useBoard'
import type { GamePlayer } from './GameStatus.vue'

const props = defineProps<{
  tile: Tile | null
  playersOnTile?: GamePlayer[]
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

const getTileDescription = (tile: Tile): string => {
  const base = 'Tu es tombé sur une case spéciale du plateau.'

  const descriptions: Record<string, string> = {
    start: 'Case de départ du plateau. Tout le monde commence ici et y repasse à chaque tour complet.',
    coins: tile.coinsChange && tile.coinsChange > 0
      ? `Tu gagnes ${tile.coinsChange} pièces en arrivant ici.`
      : `Tu perds ${Math.abs(tile.coinsChange || 0)} pièces en arrivant ici.`,
    key_shop: 'Boutique où tu peux acheter une clé contre des pièces, si tu as assez d’argent.',
    bonus: 'Une case bonus qui peut t’offrir un avantage ou une surprise positive.',
    malus: 'Une case malus qui te joue un mauvais tour (perte de pièces ou autre effet).',
    minigame: 'Lance un mini-jeu pour tous les joueurs. Le gagnant remporte des pièces.',
    empty: 'Une case neutre sans effet particulier.',
  }

  return descriptions[tile.kind] || base
}

const getTileImage = (tile: Tile): string => {
  const baseUrl = '/assets/tiles/'
  const images: Record<string, string> = {
    start: `${baseUrl}tile_start.png`,
    coins: `${baseUrl}tile_coin.png`,
    key_shop: `${baseUrl}tile_key.png`,
    bonus: `${baseUrl}tile_bonus.png`,
    malus: `${baseUrl}tile_trap.png`,
    minigame: `${baseUrl}tile_games.png`,
    empty: `${baseUrl}tile_coin.png`,
  }
  return images[tile.kind] || `${baseUrl}tile_coin.png`
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
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &--tile-info {
    flex: 1 1 0;
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

.tile-overview {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.tile-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 60px;
    max-height: 60px;
    object-fit: contain;
  }
}

.tile-tags {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f9fafb;
  font-size: 12px;
}

.tag-label {
  text-transform: uppercase;
  font-weight: 600;
  color: #6b7280;
  font-size: 10px;
}

.tag-value {
  font-weight: 600;
  color: #111827;

  &.positive {
    color: #16a34a;
  }

  &.negative {
    color: #ef4444;
  }
}

.tile-description {
  margin: 4px 0 14px 0;
  font-size: 13px;
  color: #4b5563;
}

.players-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.players-title {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.players-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.player-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef2ff;
  font-size: 12px;
}

.player-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.25);
}

.player-name {
  font-weight: 600;
  color: #374151;
}
</style>
