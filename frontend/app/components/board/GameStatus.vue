<template>
  <div class="game-status">
    <div class="panel-header">
      <h3 class="panel-title">📊 Votre statut</h3>
    </div>
    <div class="panel-content">
      <div class="player-stats">
        <div class="stat-card stat-card--coins">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-label">Pièces</div>
            <div class="stat-value">{{ currentPlayer.coins }}</div>
          </div>
        </div>

        <div class="stat-card stat-card--keys">
          <div class="stat-icon">🔑</div>
          <div class="stat-info">
            <div class="stat-label">Clés</div>
            <div class="stat-value">{{ currentPlayer.keys }}</div>
          </div>
        </div>
      </div>

      <div v-if="currentPlayer.bonuses.length > 0" class="bonuses-section">
        <h4 class="subsection-title">Vos bonus</h4>
        <div class="bonus-list">
          <div v-for="bonus in currentPlayer.bonuses" :key="bonus.id" class="bonus-item">
            <span class="bonus-icon">{{ bonus.icon }}</span>
            <span class="bonus-name">{{ bonus.name }}</span>
          </div>
        </div>
      </div>
      
      <div class="turn-section">
        <div class="turn-indicator">
          <div class="turn-label">Tour de</div>
          <div class="turn-player" :style="{ color: currentTurnPlayer.color }">
            {{ currentTurnPlayer.name }}
          </div>
        </div>
      </div>

      <div class="leaderboard-section">
        <h3 class="section-title">Classement</h3>
      <div class="leaderboard">
        <div 
          v-for="(player, index) in rankedPlayers" 
          :key="player.id" 
          class="leaderboard-item"
          :class="{ 'leaderboard-item--current': player.id === currentPlayer.id }"
        >
          <div class="rank">{{ index + 1 }}</div>
          <div class="player-avatar" :style="{ 
            backgroundColor: player.avatar ? 'transparent' : player.color,
            borderColor: player.color 
          }">
            <img v-if="player.avatar" :src="player.avatar" :alt="player.name" />
            <span v-else class="player-initial">{{ player.name[0] }}</span>
          </div>
          <div class="player-info">
            <div class="player-name">{{ player.name }}</div>
            <div class="player-resources">
              <span class="resource">🔑 {{ player.keys }}</span>
              <span class="resource">💰 {{ player.coins }}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Bonus {
  id: string
  name: string
  icon: string
}

export interface GamePlayer {
  id: string
  name: string
  color: string
  avatar?: string
  coins: number
  keys: number
  bonuses: Bonus[]
}

const props = defineProps<{
  currentPlayer: GamePlayer
  players: GamePlayer[]
  currentTurnPlayerId: string
}>()

const currentTurnPlayer = computed(() => {
  return props.players.find(p => p.id === props.currentTurnPlayerId) || props.players[0]!
})

const rankedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    if (a.keys !== b.keys) {
      return b.keys - a.keys
    }
    return b.coins - a.coins
  })
})
</script>

<style scoped lang="scss">
.game-status {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  border-bottom: 1px solid #818cf8;
}

.panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.panel-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.subsection-title {
  margin: 0 0 6px 0;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}


.player-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    box-shadow: 0 1px 2px rgba(99, 102, 241, 0.1);
  }

  &--coins {
    border-color: #e5e7eb;
    background: #fffbeb;
  }

  &--keys {
    border-color: #e5e7eb;
    background: #ecfdf5;
  }
}

.stat-icon {
  font-size: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.bonuses-section {
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.bonus-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bonus-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 11px;
}

.bonus-icon {
  font-size: 14px;
}

.bonus-name {
  font-weight: 500;
  color: #555;
}

.turn-section {
  padding: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(99, 102, 241, 0.2);
  border: 1px solid #818cf8;
}

.turn-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.turn-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.turn-player {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.leaderboard-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
  }

  &--current {
    background: #eef2ff;
    border-color: #6366f1;
    box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);
  }
}

.rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.player-initial {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.player-resources {
  display: flex;
  gap: 8px;
}

.resource {
  font-size: 10px;
  font-weight: 500;
  color: #666;
}
</style>
