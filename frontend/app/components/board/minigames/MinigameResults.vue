<template>
  <div class="minigame-results">
    <div class="results-header">
      <h2 class="results-title">🏆 Résultats</h2>
      <p class="results-subtitle">{{ gameName }}</p>
    </div>

    <div class="results-podium">
      <div v-for="(result, index) in sortedResults" :key="result.playerId" 
        class="podium-item" 
        :class="`podium-item--${index + 1}`">
        <div class="podium-rank">
          <span class="rank-number">{{ index + 1 }}</span>
          <span class="rank-medal">{{ getMedal(index) }}</span>
        </div>
        <div class="podium-player">
          <div class="player-avatar" :style="{ backgroundColor: result.playerColor }">
            {{ result.playerName.charAt(0).toUpperCase() }}
          </div>
          <div class="player-info">
            <span class="player-name">{{ result.playerName }}</span>
            <span class="player-score">{{ formatScore(result.score) }}</span>
          </div>
        </div>
        <div class="podium-reward">
          <span class="reward-coins">+{{ result.coinsEarned }} 💰</span>
        </div>
      </div>
    </div>

    <div class="results-footer">
      <button @click="$emit('close')" class="btn btn--primary">
        Continuer
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MinigameResult {
  playerId: string
  playerName: string
  playerColor: string
  score: number
  coinsEarned: number
}

const props = defineProps<{
  gameName: string
  results: MinigameResult[]
  scoreLabel?: string // Ex: "Temps moyen", "Points", etc.
}>()

defineEmits<{
  close: []
}>()

const sortedResults = computed(() => {
  // Les résultats sont déjà triés par le backend selon le classement
  // Ne pas re-trier ici pour garder l'ordre correct
  return props.results
})

const getMedal = (index: number): string => {
  const medals = ['🥇', '🥈', '🥉']
  return medals[index] || '🏅'
}

const formatScore = (score: number): string => {
  if (props.scoreLabel) {
    return `${score} ${props.scoreLabel}`
  }
  return score.toString()
}
</script>

<style scoped lang="scss">
.minigame-results {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-header {
  text-align: center;
  margin-bottom: 32px;
}

.results-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.results-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.results-podium {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.podium-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  transition: all 0.3s;
  animation: fadeIn 0.5s ease-out backwards;

  &--1 {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    animation-delay: 0.1s;
  }

  &--2 {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-color: #9ca3af;
    animation-delay: 0.2s;
  }

  &--3 {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border-color: #f97316;
    animation-delay: 0.3s;
  }

  @for $i from 4 through 10 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.1}s;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.podium-rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 50px;
}

.rank-number {
  font-size: 20px;
  font-weight: 800;
  color: #1f2937;
}

.rank-medal {
  font-size: 24px;
}

.podium-player {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: white;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.player-score {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.podium-reward {
  display: flex;
  align-items: center;
}

.reward-coins {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
  padding: 8px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.results-footer {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 2px solid #e5e7eb;
}

.btn {
  padding: 14px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &--primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
  }
}
</style>
