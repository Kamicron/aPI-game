<template>
  <div class="reaction-game">
    <div class="game-header">
      <h2 class="game-title">⚡ Réflexes Éclair</h2>
      <p class="game-instructions">Clique dès que le bouton devient vert !</p>
      <div class="game-progress">
        <span class="round-indicator">Round {{ currentRound }} / {{ totalRounds }}</span>
      </div>
    </div>

    <div class="game-content">
      <div v-if="gameState === 'ready'" class="game-ready">
        <p class="ready-text">Prépare-toi...</p>
        <button @click="startRound" class="btn btn--start">
          Commencer
        </button>
      </div>

      <div v-else-if="gameState === 'waiting'" class="game-waiting">
        <div class="reaction-button reaction-button--red" @click="handleEarlyClick">
          <span class="button-text">Attends...</span>
        </div>
        <p class="hint-text">⏳ Le bouton va devenir vert...</p>
      </div>

      <div v-else-if="gameState === 'active'" class="game-active">
        <div class="reaction-button reaction-button--green" @click="handleClick">
          <span class="button-text">CLIQUE !</span>
        </div>
        <p class="hint-text">⚡ Clique maintenant !</p>
      </div>

      <div v-else-if="gameState === 'result'" class="game-result">
        <div class="result-card" :class="resultClass">
          <span class="result-icon">{{ resultIcon }}</span>
          <span class="result-time">{{ lastReactionTime }}ms</span>
          <span class="result-label">{{ resultLabel }}</span>
        </div>
        <button @click="nextRound" class="btn btn--next">
          {{ currentRound < totalRounds ? 'Round suivant' : 'Voir les résultats' }}
        </button>
      </div>

      <div v-else-if="gameState === 'finished'" class="game-finished">
        <div class="final-score">
          <h3>Score Final</h3>
          <p class="average-time">{{ averageTime }}ms</p>
          <p class="score-label">Temps moyen</p>
        </div>
      </div>
    </div>

    <div v-if="reactionTimes.length > 0" class="game-history">
      <h4>Historique</h4>
      <div class="history-list">
        <div v-for="(time, index) in reactionTimes" :key="index" class="history-item">
          <span class="history-round">R{{ index + 1 }}</span>
          <span class="history-time" :class="{ 'history-time--penalty': time === -1 }">
            {{ time === -1 ? 'Trop tôt !' : `${time}ms` }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits<{
  finish: [score: number]
}>()

const totalRounds = 3
const currentRound = ref(1)
const gameState = ref<'ready' | 'waiting' | 'active' | 'result' | 'finished'>('ready')
const reactionTimes = ref<number[]>([])
const lastReactionTime = ref(0)
const startTime = ref(0)
let waitTimeout: NodeJS.Timeout | null = null

// Fonction de réinitialisation
const resetGame = () => {
  currentRound.value = 1
  gameState.value = 'ready'
  reactionTimes.value = []
  lastReactionTime.value = 0
  startTime.value = 0
  if (waitTimeout) {
    clearTimeout(waitTimeout)
    waitTimeout = null
  }
}

// Réinitialiser au montage du composant
onMounted(() => {
  resetGame()
})

const averageTime = computed(() => {
  if (reactionTimes.value.length === 0) return 0
  
  // Remplacer les -1 (erreurs) par 9999ms pour les inclure dans la moyenne
  const timesWithPenalty = reactionTimes.value.map(t => t === -1 ? 9999 : t)
  return Math.round(timesWithPenalty.reduce((a, b) => a + b, 0) / timesWithPenalty.length)
})

const resultClass = computed(() => {
  if (lastReactionTime.value === -1) return 'result-card--penalty'
  if (lastReactionTime.value < 200) return 'result-card--excellent'
  if (lastReactionTime.value < 300) return 'result-card--good'
  return 'result-card--ok'
})

const resultIcon = computed(() => {
  if (lastReactionTime.value === -1) return '❌'
  if (lastReactionTime.value < 200) return '🔥'
  if (lastReactionTime.value < 300) return '⭐'
  return '👍'
})

const resultLabel = computed(() => {
  if (lastReactionTime.value === -1) return 'Trop tôt !'
  if (lastReactionTime.value < 200) return 'Excellent !'
  if (lastReactionTime.value < 300) return 'Très bien !'
  if (lastReactionTime.value < 400) return 'Bien !'
  return 'Pas mal !'
})

const startRound = () => {
  gameState.value = 'waiting'
  
  // Délai aléatoire entre 1 et 3 secondes
  const delay = Math.random() * 2000 + 1000
  
  waitTimeout = setTimeout(() => {
    gameState.value = 'active'
    startTime.value = performance.now()
  }, delay)
}

const handleEarlyClick = () => {
  // Clic trop tôt = pénalité
  if (waitTimeout) {
    clearTimeout(waitTimeout)
    waitTimeout = null
  }
  
  lastReactionTime.value = -1
  reactionTimes.value.push(-1)
  gameState.value = 'result'
}

const handleClick = () => {
  const reactionTime = Math.round(performance.now() - startTime.value)
  lastReactionTime.value = reactionTime
  reactionTimes.value.push(reactionTime)
  gameState.value = 'result'
}

const nextRound = () => {
  if (currentRound.value < totalRounds) {
    currentRound.value++
    gameState.value = 'ready'
  } else {
    gameState.value = 'finished'
    // Envoyer le temps moyen comme score
    // Plus le temps est bas, mieux c'est (le backend fera le tri croissant)
    // Les erreurs (-1) sont comptées comme 9999ms dans la moyenne
    const score = averageTime.value
    console.log('🎮 Reaction times:', reactionTimes.value)
    console.log('🎮 Times with penalty:', reactionTimes.value.map(t => t === -1 ? 9999 : t))
    console.log('🎮 Average time:', averageTime.value)
    console.log('🎮 Final score:', score)
    emit('finish', score)
  }
}
</script>

<style scoped lang="scss">
.reaction-game {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.game-header {
  text-align: center;
  margin-bottom: 32px;
}

.game-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.game-instructions {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
}

.game-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.round-indicator {
  padding: 6px 16px;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #6366f1;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.reaction-button {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  user-select: none;

  &--red {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    
    &:hover {
      transform: scale(1.05);
    }
  }

  &--green {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    animation: pulse 0.5s ease-in-out infinite;
    
    &:active {
      transform: scale(0.95);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.button-text {
  font-size: 24px;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hint-text {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

.result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  border-radius: 16px;
  min-width: 250px;

  &--excellent {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  }

  &--good {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  }

  &--ok {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  }

  &--penalty {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  }
}

.result-icon {
  font-size: 48px;
}

.result-time {
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
}

.result-label {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &--start, &--next {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
  }
}

.game-history {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e5e7eb;

  h4 {
    font-size: 14px;
    font-weight: 700;
    color: #6b7280;
    margin: 0 0 12px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.history-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.history-round {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}

.history-time {
  font-size: 14px;
  font-weight: 700;
  color: #10b981;

  &--penalty {
    color: #ef4444;
  }
}

.final-score {
  text-align: center;
  padding: 32px;

  h3 {
    font-size: 20px;
    font-weight: 700;
    color: #6b7280;
    margin: 0 0 16px 0;
  }
}

.average-time {
  font-size: 48px;
  font-weight: 800;
  color: #6366f1;
  margin: 0;
}

.score-label {
  font-size: 16px;
  color: #6b7280;
  margin: 8px 0 0 0;
}
</style>
