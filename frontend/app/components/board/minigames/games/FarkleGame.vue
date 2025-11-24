<template>
  <div class="farkle-game">
    <div class="game-header">
      <h2 class="game-title">🎲 Farkle</h2>
      <p class="game-instructions">Accumule des points en lançant les dés. Arrête-toi avant de tout perdre !</p>
      <div class="game-stats">
        <div class="stat-chip stat-chip--primary">
          <span class="stat-label">Score Total</span>
          <span class="stat-value">{{ totalScore }}</span>
        </div>
        <div class="stat-chip stat-chip--secondary">
          <span class="stat-label">Score du Tour</span>
          <span class="stat-value">{{ turnScore }}</span>
        </div>
      </div>
    </div>

    <div class="game-content">
      <div v-if="gameState === 'ready'" class="game-ready">
        <div class="rules-panel">
          <h3>📋 Règles rapides</h3>
          <ul class="rules-list">
            <li><strong>1</strong> = 100 pts · <strong>5</strong> = 50 pts</li>
            <li><strong>3 dés identiques</strong> = nombre × 100 (ex: 3×4 = 400)</li>
            <li><strong>6 dés identiques</strong> = nombre × 100 × 2 (ex: 6×1 = 2000)</li>
            <li><strong>Suite 1-2-3-4-5-6</strong> = 1500 pts</li>
            <li>Garde au moins 1 dé gagnant à chaque lancé</li>
            <li>Si aucun dé ne marque → tu perds tout le tour !</li>
            <li>Tous les dés marqués → relance les 6 dés (score conservé)</li>
          </ul>
        </div>
        <button class="btn btn--start" @click="startGame">Commencer</button>
      </div>

      <div v-else-if="gameState === 'playing'" class="game-playing">
        <div class="dice-area">
          <div class="dice-grid">
            <button
              v-for="die in dice"
              :key="die.id"
              class="die"
              :class="{
                'die--locked': die.locked,
                'die--selected': die.selected,
                'die--rolling': die.rolling
              }"
              @click="toggleDieSelection(die.id)"
              :disabled="die.locked || die.rolling"
            >
              <span class="die-value">{{ die.rolling ? '?' : die.value }}</span>
            </button>
          </div>

          <div class="dice-info">
            <p class="dice-hint" v-if="!isRolling">
              {{ selectionHint }}
            </p>
            <p class="dice-hint rolling-hint" v-else>
              🎲 Lancement des dés...
            </p>
          </div>
        </div>

        <div class="action-panel">
          <div class="score-preview" v-if="selectedDiceScore > 0">
            <span class="preview-label">Points sélectionnés :</span>
            <span class="preview-value">+{{ selectedDiceScore }}</span>
          </div>

          <div class="action-buttons">
            <button
              class="btn btn--roll"
              @click="rollDice"
              :disabled="isRolling || !canRoll"
            >
              {{ availableDice === 6 ? 'Lancer les dés' : `Relancer (${availableDice} dés)` }}
            </button>
            <button
              class="btn btn--bank"
              @click="bankScore"
              :disabled="(turnScore === 0 && selectedDiceScore === 0) || isRolling || availableDice === 6"
            >
              Sécuriser {{ turnScore + selectedDiceScore }} pts
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="gameState === 'busted'" class="game-busted">
        <div class="busted-panel">
          <span class="busted-icon">💥</span>
          <h3>Raté !</h3>
          <p class="busted-text">Aucun dé gagnant... Tu perds tout !</p>
          <p class="busted-score">Score final : {{ totalScore }} points</p>
          <button class="btn btn--continue" @click="submitScore">Envoyer mon score</button>
        </div>
      </div>

      <div v-else-if="gameState === 'finished'" class="game-finished">
        <div class="final-score">
          <h3>Partie terminée !</h3>
          <p class="score-value">{{ totalScore }} points</p>
          <p class="score-label">Score final</p>
          <button class="btn btn--submit" @click="submitScore">Envoyer mon score</button>
        </div>
      </div>
    </div>

    <div v-if="gameState === 'playing'" class="game-footer">
      <button class="btn-text btn-text--danger" @click="endGame">
        Terminer la partie
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  finish: [score: number]
}>()

interface Die {
  id: number
  value: number
  locked: boolean
  selected: boolean
  rolling: boolean
}

const gameState = ref<'ready' | 'playing' | 'busted' | 'finished'>('ready')
const totalScore = ref(0)
const turnScore = ref(0)
const dice = ref<Die[]>([])
const isRolling = ref(false)
let nextDieId = 1

const availableDice = computed(() => {
  // Compter les dés qui seront relancés
  const diceToRoll = dice.value.filter(d => !d.locked && !d.selected).length
  
  // Si tous les dés seront verrouillés après le prochain lancer, on relancera les 6
  const willAllBeLocked = dice.value.every(d => d.locked || d.selected)
  
  return willAllBeLocked ? 6 : diceToRoll
})

const selectedDice = computed(() => {
  return dice.value.filter(d => d.selected && !d.locked)
})

const selectedDiceScore = computed(() => {
  return calculateScore(selectedDice.value.map(d => d.value))
})

const selectionHint = computed(() => {
  if (selectedDice.value.length === 0) {
    return '👆 Sélectionne au moins 1 dé gagnant'
  }
  if (selectedDiceScore.value === 0) {
    return '⚠️ Les dés sélectionnés ne marquent pas de points'
  }
  if (!areAllSelectedDiceScoring()) {
    return '⚠️ Certains dés sélectionnés ne contribuent pas au score'
  }
  return '✅ Clique sur "Relancer" ou "Sécuriser"'
})

const areAllSelectedDiceScoring = (): boolean => {
  if (selectedDice.value.length === 0) return false
  
  const selectedValues = selectedDice.value.map(d => d.value)
  const totalScore = calculateScore(selectedValues)
  
  if (totalScore === 0) return false
  
  // Vérifier que chaque dé contribue au score
  // On teste en enlevant chaque dé un par un
  for (let i = 0; i < selectedValues.length; i++) {
    const withoutThisDie = selectedValues.filter((_, index) => index !== i)
    const scoreWithout = calculateScore(withoutThisDie)
    
    // Si le score ne change pas en enlevant ce dé, c'est qu'il ne contribue pas
    if (scoreWithout === totalScore) {
      return false
    }
  }
  
  return true
}

const canRoll = computed(() => {
  // On peut relancer seulement si tous les dés sélectionnés contribuent au score
  return selectedDice.value.length > 0 && areAllSelectedDiceScoring()
})

const initializeDice = () => {
  dice.value = Array.from({ length: 6 }, (_, i) => ({
    id: nextDieId++,
    value: 1,
    locked: false,
    selected: false,
    rolling: false
  }))
}

const calculateScore = (values: number[]): number => {
  if (values.length === 0) return 0

  let score = 0
  const counts = new Map<number, number>()

  // Compter les occurrences
  for (const val of values) {
    counts.set(val, (counts.get(val) || 0) + 1)
  }

  // Vérifier la grande suite (1-2-3-4-5-6)
  if (values.length === 6) {
    const sorted = [...values].sort((a, b) => a - b)
    if (sorted.join('') === '123456') {
      return 1500
    }
  }

  // Traiter les groupes de dés identiques
  for (const [value, count] of counts.entries()) {
    if (count === 6) {
      // 6 dés identiques = n × 100 × 2
      if (value === 1) {
        score += 2000 // 1 × 100 × 2 × 10 (car 3×1 = 1000)
      } else {
        score += value * 100 * 2
      }
      counts.set(value, 0)
    } else if (count >= 3) {
      // 3 dés identiques ou plus (mais pas 6)
      if (value === 1) {
        score += 1000
      } else {
        score += value * 100
      }
      counts.set(value, count - 3)
    }
  }

  // Traiter les 1 et 5 restants
  const remainingOnes = counts.get(1) || 0
  const remainingFives = counts.get(5) || 0

  score += remainingOnes * 100
  score += remainingFives * 50

  return score
}

const hasAnyScore = (values: number[]): boolean => {
  return calculateScore(values) > 0
}

const startGame = async () => {
  gameState.value = 'playing'
  totalScore.value = 0
  turnScore.value = 0
  initializeDice()
  
  // Lancer automatiquement les dés au démarrage
  await rollInitialDice()
}

const rollInitialDice = async () => {
  isRolling.value = true
  
  // Animation de roulement
  for (const die of dice.value) {
    die.rolling = true
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  // Générer les valeurs
  for (const die of dice.value) {
    die.value = Math.floor(Math.random() * 6) + 1
    die.rolling = false
  }

  isRolling.value = false

  // Vérifier si au moins un dé marque
  const values = dice.value.map(d => d.value)
  if (!hasAnyScore(values)) {
    // Relancer automatiquement si aucun dé ne marque au premier lancer
    await rollInitialDice()
  }
}

const rollDice = async () => {
  if (isRolling.value || selectedDice.value.length === 0) return

  // Vérifier que les dés sélectionnés marquent des points
  if (selectedDiceScore.value === 0) {
    return
  }

  // Sauvegarder le score avant de verrouiller
  const scoreToAdd = selectedDiceScore.value
  console.log('🎲 Score to add:', scoreToAdd)
  console.log('🎲 Turn score before:', turnScore.value)

  // Verrouiller les dés sélectionnés et ajouter leur score
  for (const die of selectedDice.value) {
    die.locked = true
    die.selected = false
  }

  turnScore.value += scoreToAdd
  console.log('🎲 Turn score after:', turnScore.value)

  // Si tous les dés sont verrouillés, les réinitialiser tous
  const allLocked = dice.value.every(d => d.locked)
  if (allLocked) {
    console.log('🎲 All dice locked! Unlocking all and keeping turnScore:', turnScore.value)
    for (const die of dice.value) {
      die.locked = false
    }
  }

  // Lancer les dés non verrouillés
  isRolling.value = true
  const diceToRoll = dice.value.filter(d => !d.locked)

  // Animation de roulement
  for (const die of diceToRoll) {
    die.rolling = true
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  // Générer les nouvelles valeurs
  for (const die of diceToRoll) {
    die.value = Math.floor(Math.random() * 6) + 1
    die.rolling = false
  }

  isRolling.value = false

  // Vérifier si au moins un dé marque
  const newValues = diceToRoll.map(d => d.value)
  if (!hasAnyScore(newValues)) {
    // Bust! Le joueur perd tout le score du tour
    console.log('🎲 BUST! No scoring dice. Turn score lost:', turnScore.value)
    gameState.value = 'busted'
  }
}

const toggleDieSelection = (dieId: number) => {
  const die = dice.value.find(d => d.id === dieId)
  if (!die || die.locked || die.rolling) return

  die.selected = !die.selected
}

const bankScore = () => {
  if (isRolling.value) return

  // Ajouter les points sélectionnés au score du tour
  const finalTurnScore = turnScore.value + selectedDiceScore.value
  
  if (finalTurnScore === 0) return

  // Ajouter au score total et terminer le jeu
  totalScore.value += finalTurnScore
  
  // Terminer le jeu complètement
  endGame()
}

const continuePlaying = async () => {
  turnScore.value = 0
  gameState.value = 'playing'
  initializeDice()
  await rollInitialDice()
}

const endGame = () => {
  gameState.value = 'finished'
}

const submitScore = () => {
  emit('finish', totalScore.value)
}
</script>

<style scoped lang="scss">
.farkle-game {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 700px;
  width: 100%;
  min-height: 500px;
  display: flex;
  flex-direction: column;
}

.game-header {
  text-align: center;
  margin-bottom: 24px;
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

.game-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-chip {
  padding: 8px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 120px;

  &--primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    .stat-value {
      color: white;
    }
  }

  &--secondary {
    background: #f3f4f6;

    .stat-label {
      color: #6b7280;
    }

    .stat-value {
      color: #1f2937;
    }
  }
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.game-ready {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 500px;
}

.rules-panel {
  background: #f9fafb;
  border-radius: 12px;
  padding: 24px;
  width: 100%;

  h3 {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 16px 0;
    color: #1f2937;
  }
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.6;

    strong {
      color: #6366f1;
      font-weight: 700;
    }
  }
}

.game-playing {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dice-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.die {
  aspect-ratio: 1;
  border: 3px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &--selected {
    border-color: #6366f1;
    background: #eef2ff;
    transform: translateY(-4px);
  }

  &--locked {
    border-color: #10b981;
    background: #d1fae5;
    opacity: 0.7;
    cursor: not-allowed;
  }

  &--rolling {
    animation: roll 0.5s ease-in-out;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

@keyframes roll {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(90deg);
  }
  50% {
    transform: rotate(180deg);
  }
  75% {
    transform: rotate(270deg);
  }
}

.die-value {
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
}

.dice-info {
  text-align: center;
  min-height: 24px;
}

.dice-hint {
  font-size: 14px;
  color: #6b7280;
  margin: 0;

  &.rolling-hint {
    color: #6366f1;
    font-weight: 600;
  }
}

.action-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.score-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fef3c7;
  border-radius: 8px;
}

.preview-label {
  font-size: 14px;
  color: #92400e;
  font-weight: 600;
}

.preview-value {
  font-size: 18px;
  color: #92400e;
  font-weight: 800;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &--start, &--submit, &--continue {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
  }

  &--roll {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    }
  }

  &--bank {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
    }
  }
}

.game-busted {
  display: flex;
  align-items: center;
  justify-content: center;
}

.busted-panel {
  text-align: center;
  padding: 32px;
  background: #fef2f2;
  border-radius: 16px;
  max-width: 400px;

  h3 {
    font-size: 24px;
    font-weight: 800;
    color: #991b1b;
    margin: 16px 0 8px 0;
  }
}

.busted-icon {
  font-size: 64px;
}

.busted-text {
  font-size: 16px;
  color: #7f1d1d;
  margin: 0 0 8px 0;
}

.busted-score {
  font-size: 20px;
  font-weight: 700;
  color: #991b1b;
  margin: 0 0 24px 0;
}

.game-finished {
  display: flex;
  align-items: center;
  justify-content: center;
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

.score-value {
  font-size: 48px;
  font-weight: 800;
  color: #6366f1;
  margin: 0;
}

.score-label {
  font-size: 16px;
  color: #6b7280;
  margin: 8px 0 24px 0;
}

.game-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

.btn-text {
  background: none;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;

  &--danger {
    color: #dc2626;

    &:hover {
      background: #fef2f2;
    }
  }
}
</style>
