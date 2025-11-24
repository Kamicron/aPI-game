<template>
  <div class="simon-game">
    <div class="game-header">
      <h2 class="game-title">🧠 Mémoire de Simon</h2>
      <p class="game-instructions">Mémorise et répète la séquence de couleurs le plus longtemps possible.</p>
      <div class="game-progress">
        <span class="round-indicator">
          {{ displayRound !== null ? `Niveau ${displayRound}` : '\u00A0' }}
        </span>
      </div>
    </div>

    <div class="game-content">
      <div v-if="gameState === 'ready'" class="game-ready">
        <p class="ready-text">Prépare-toi à suivre la séquence...</p>
        <button @click="startGame" class="btn btn--start">Commencer</button>
      </div>

      <div v-else-if="gameState === 'intro'" class="game-intro">
        <p class="hint-text">Observe bien les couleurs, la séquence va commencer...</p>
        <div class="simon-grid">
          <button v-for="color in colors" :key="color.id" class="simon-pad" :class="'simon-pad--' + color.id"
            disabled></button>
        </div>
      </div>

      <div v-else-if="gameState === 'showing'" class="game-showing">
        <p class="hint-text">Regarde attentivement la séquence...</p>
        <div class="simon-grid">
          <button v-for="color in colors" :key="color.id" class="simon-pad"
            :class="['simon-pad--' + color.id, { 'simon-pad--active': activeColor === color.id }]" disabled></button>
        </div>
      </div>

      <div v-else-if="gameState === 'input'" class="game-input">
        <p class="hint-text">Reproduis la séquence en cliquant sur les couleurs.</p>
        <div class="simon-grid">
          <button v-for="color in colors" :key="color.id" class="simon-pad"
            :class="['simon-pad--' + color.id, { 'simon-pad--active': activeColor === color.id }]"
            @click="handlePadClick(color.id)"></button>
        </div>
      </div>

      <div v-else-if="gameState === 'finished'" class="game-finished">
        <div class="final-score">
          <h3>Fin de la partie</h3>
          <p class="score-value">Niveau atteint&nbsp;: {{ maxRoundReached }}</p>
          <p class="score-label">Plus le niveau est élevé, mieux c'est.</p>
          <button class="btn btn--start" @click="submitScore">Envoyer mon score</button>
        </div>
      </div>
    </div>

    <p class="input-progress" v-if="gameState !== 'finished'">
      {{ (gameState === 'input' || gameState === 'intro' || gameState === 'showing')
        ? `Saisie ${playerInput.length} / ${displaySequenceLength}`
        : '\u00A0' }}
    </p>

    <div v-if="gameState === 'finished' && maxRoundReached > 0" class="game-history">
      <h4>Résumé</h4>
      <p>Niveau maximal réussi&nbsp;: {{ maxRoundReached }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  finish: [score: number]
}>()

interface SimonColor {
  id: 'red' | 'green' | 'blue' | 'yellow'
}

const colors: SimonColor[] = [
  { id: 'green' },
  { id: 'red' },
  { id: 'yellow' },
  { id: 'blue' },
]

const gameState = ref<'ready' | 'intro' | 'showing' | 'input' | 'finished'>('ready')
const sequence = ref<SimonColor['id'][]>([])
const playerInput = ref<SimonColor['id'][]>([])
const round = ref(0)
const maxRoundReached = ref(0)
const activeColor = ref<SimonColor['id'] | null>(null)
let showTimeout: number | null = null

const displayRound = computed(() => {
  if (gameState.value === 'ready') return 1
  if (round.value > 0) return round.value
  if (gameState.value === 'intro') return 1
  return null
})

const displaySequenceLength = computed(() => {
  if (sequence.value.length > 0) return sequence.value.length
  if (gameState.value === 'intro') return 1
  return sequence.value.length
})

const clearShowTimeout = () => {
  if (showTimeout !== null) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
}

const getRandomColor = (): SimonColor['id'] => {
  const index = Math.floor(Math.random() * colors.length)
  return colors[index].id
}

const startGame = () => {
  clearShowTimeout()
  sequence.value = []
  playerInput.value = []
  round.value = 0
  maxRoundReached.value = 0
  activeColor.value = null
  // Petit délai avec le plateau éteint pour laisser le joueur s'habituer
  gameState.value = 'intro'
  window.setTimeout(() => {
    nextRound()
  }, 1200)
}

const nextRound = () => {
  // Ajouter une nouvelle couleur à la séquence
  sequence.value = [...sequence.value, getRandomColor()]
  round.value = sequence.value.length
  gameState.value = 'showing'
  playerInput.value = []
  playSequence()
}

const playSequence = () => {
  clearShowTimeout()
  let index = 0

  const step = () => {
    const currentSequence = sequence.value
    if (index >= currentSequence.length) {
      activeColor.value = null
      gameState.value = 'input'
      return
    }

    const color = currentSequence[index]
    activeColor.value = color ?? null

    // Durée d'activation
    showTimeout = window.setTimeout(() => {
      activeColor.value = null
      showTimeout = window.setTimeout(() => {
        index++
        step()
      }, 200)
    }, 600)
  }

  step()
}

const endGame = () => {
  clearShowTimeout()
  gameState.value = 'finished'
}

const submitScore = () => {
  // Score = niveau maximal atteint (valeur positive)
  const logicalScore = maxRoundReached.value
  emit('finish', logicalScore)
}

const handlePadClick = (colorId: SimonColor['id']) => {
  if (gameState.value !== 'input') return

  // Petite mise en évidence
  activeColor.value = colorId
  window.setTimeout(() => {
    if (activeColor.value === colorId) {
      activeColor.value = null
    }
  }, 200)

  playerInput.value = [...playerInput.value, colorId]
  const currentIndex = playerInput.value.length - 1

  // Vérifier la correspondance avec la séquence
  if (sequence.value[currentIndex] !== colorId) {
    // Erreur : partie terminée, le niveau réussi est le précédent
    maxRoundReached.value = Math.max(maxRoundReached.value, round.value - 1)
    endGame()
    return
  }

  // Si le joueur a correctement complété toute la séquence
  if (playerInput.value.length === sequence.value.length) {
    maxRoundReached.value = Math.max(maxRoundReached.value, round.value)
    // Petite pause avant le prochain round
    gameState.value = 'showing'
    window.setTimeout(() => {
      nextRound()
    }, 600)
  }
}
</script>

<style scoped lang="scss">
.simon-game {
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
  margin-bottom: 24px;
}

.game-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.game-instructions {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.game-progress {
  display: flex;
  justify-content: center;
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
  min-height: 320px;
  /* stabilise la hauteur quel que soit l'état */
}

.simon-grid {
  display: grid;
  grid-template-columns: repeat(2, 150px);
  grid-template-rows: repeat(2, 150px);
  gap: 20px;
}

.simon-pad {
  border: none;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  width: 150px;
  height: 150px;

  &--green {
    background: radial-gradient(circle at 30% 30%, #064e3b, #059669);
  }

  &--red {
    background: radial-gradient(circle at 30% 30%, #7f1d1d, #dc2626);
  }

  &--yellow {
    background: radial-gradient(circle at 30% 30%, #78350f, #eab308);
  }

  &--blue {
    background: radial-gradient(circle at 30% 30%, #111827, #2563eb);
  }

  &--active {
    transform: scale(1.06);
    filter: brightness(1.3);
  }

  &--green.simon-pad--active {
    box-shadow: 0 0 30px rgba(34, 197, 94, 0.9);
  }

  &--red.simon-pad--active {
    box-shadow: 0 0 30px rgba(248, 113, 113, 0.9);
  }

  &--yellow.simon-pad--active {
    box-shadow: 0 0 30px rgba(250, 204, 21, 0.9);
  }

  &--blue.simon-pad--active {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.9);
  }
}

.hint-text {
  font-size: 15px;
  color: #4b5563;
  text-align: center;
}

.input-progress {
  font-size: 13px;
  color: #6b7280;
  min-height: 18px;
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

  &--start {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
  }
}

.final-score {
  text-align: center;
}

.score-value {
  font-size: 32px;
  font-weight: 800;
  color: #6366f1;
  margin: 8px 0;
}

.score-label {
  font-size: 14px;
  color: #6b7280;
}

.game-history {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;

  h4 {
    font-size: 14px;
    font-weight: 700;
    color: #6b7280;
    margin: 0 0 8px 0;
  }
}

.game-ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
