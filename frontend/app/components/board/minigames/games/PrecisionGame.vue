<template>
  <div class="precision-game">
    <div class="game-header">
      <h2 class="game-title">🎯 Précision</h2>
      <p class="game-instructions">Clique sur les bonnes cibles, évite les rouges, le plus précisément possible en 60
        secondes.</p>
      <div class="game-stats">
        <div class="stat-chip">
          <span class="stat-label">Temps</span>
          <span class="stat-value">{{ remainingTime }}s</span>
        </div>
        <div class="stat-chip">
          <span class="stat-label">Score</span>
          <span class="stat-value">{{ score }}</span>
        </div>
        <div class="stat-chip">
          <span class="stat-label">Combo</span>
          <span class="stat-value">x{{ combo }}</span>
        </div>
      </div>
    </div>

    <div class="game-content" v-if="gameState !== 'finished'">
      <div v-if="gameState === 'ready'" class="intro-panel">
        <p class="intro-text">
          Clique sur les cibles vertes pour marquer des points et enchaîner les combos.
          Évite les cibles rouges et les clics à côté, ils te font perdre des points et cassent ton combo.
        </p>
        <button class="btn btn--primary" @click="startGame">
          Commencer
        </button>
      </div>

      <div v-else class="play-wrapper">
        <div class="play-area" @click="handleBackgroundClick">
          <button v-for="obj in objects" :key="obj.id" class="target" :class="[
            obj.type === 'good' ? 'target--good' : 'target--bad',
            { 'target--popping': obj.justSpawned }
          ]" :style="{
            left: obj.x + '%',
            top: obj.y + '%'
          }" @click.stop="handleObjectClick(obj)" />
        </div>

        <div class="hint-line">
          <span>Bon clic&nbsp;: +10 pts · Combo +2/étape &nbsp;·&nbsp; Mauvaise cible&nbsp;: -50 pts · Combo
            réinitialisé &nbsp;·&nbsp; Clic à côté&nbsp;: -5 pts</span>
        </div>
      </div>
    </div>

    <div v-else class="game-finished">
      <div class="final-score">
        <h3>Fin de la partie</h3>
        <p class="score-value">Score&nbsp;: {{ score }}</p>
        <p class="score-label">Meilleur combo&nbsp;: {{ bestCombo }}</p>
        <p class="score-details">
          Bonnes cibles&nbsp;: {{ goodHits }} · Mauvaises cibles&nbsp;: {{ badHits }} · Misclicks&nbsp;: {{ missClicks
          }}
        </p>
        <button class="btn btn--primary" @click="submitScore">Envoyer mon score</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  finish: [score: number]
}>()

interface PrecisionObject {
  id: number
  type: 'good' | 'bad'
  x: number // en % de la largeur
  y: number // en % de la hauteur
  justSpawned?: boolean
}

const GAME_DURATION = 60 // secondes
const SPAWN_INTERVAL = 700 // ms
const MAX_OBJECTS = 20
const MIN_OBJECTS = 5

const gameState = ref<'ready' | 'playing' | 'finished'>('ready')
const score = ref(0)
const combo = ref(0)
const bestCombo = ref(0)
const remainingTime = ref(GAME_DURATION)

const objects = ref<PrecisionObject[]>([])
let nextId = 1

const goodHits = ref(0)
const badHits = ref(0)
const missClicks = ref(0)

let timerInterval: number | null = null
let spawnInterval: number | null = null

const playSound = (type: 'good' | 'bad' | 'miss') => {
  if (typeof window === 'undefined') return

  let src = ''
  if (type === 'good') src = '/sound/ui-pop-sound.wav'
  else if (type === 'bad') src = '/sound/error-pop.wav'
  else src = '/sound/miss-click.wav'

  const audio = new Audio(src)
  audio.volume = type === 'good' ? 0.6 : 0.5
  audio.play().catch(() => { })
}

const clearIntervals = () => {
  if (timerInterval !== null) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (spawnInterval !== null) {
    clearInterval(spawnInterval)
    spawnInterval = null
  }
}

const spawnObject = () => {
  if (objects.value.length >= MAX_OBJECTS) return

  const hasGood = objects.value.some(o => o.type === 'good')
  // Si aucune bonne cible à l'écran, forcer cette cible en "good" pour éviter les phases injustes
  const type: 'good' | 'bad' = hasGood
    ? (Math.random() < 0.75 ? 'good' : 'bad')
    : 'good'

  const obj: PrecisionObject = {
    id: nextId++,
    type,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    justSpawned: true,
  }

  objects.value.push(obj)

  // retirer le flag de spawn pour l'animation
  setTimeout(() => {
    obj.justSpawned = false
  }, 150)

  // supprimer l'objet après un certain temps (durée de vie allongée)
  setTimeout(() => {
    objects.value = objects.value.filter(o => o.id !== obj.id)
  }, 2300)
}

const ensureMinimumObjects = () => {
  if (gameState.value !== 'playing') return
  while (objects.value.length < MIN_OBJECTS && objects.value.length < MAX_OBJECTS) {
    spawnObject()
  }
}

const startGame = () => {
  gameState.value = 'playing'
  remainingTime.value = GAME_DURATION
  score.value = 0
  combo.value = 0
  bestCombo.value = 0
  goodHits.value = 0
  badHits.value = 0
  missClicks.value = 0
  objects.value = []

  clearIntervals()

  // Pré-remplir pour atteindre le minimum dès le début
  ensureMinimumObjects()

  // À chaque tick, s'assurer qu'on a toujours au moins MIN_OBJECTS
  spawnInterval = window.setInterval(ensureMinimumObjects, SPAWN_INTERVAL)

  timerInterval = window.setInterval(() => {
    remainingTime.value -= 1
    if (remainingTime.value <= 0) {
      remainingTime.value = 0
      endGame()
    }
  }, 1000)
}

const endGame = () => {
  clearIntervals()
  gameState.value = 'finished'
}

const handleObjectClick = (obj: PrecisionObject) => {
  if (gameState.value !== 'playing') return

  const before = objects.value.length
  objects.value = objects.value.filter(o => o.id !== obj.id)

  // Remettre à niveau si besoin (sans téléportation instantanée multiple)
  if (objects.value.length < MIN_OBJECTS && objects.value.length < before) {
    spawnObject()
  }

  if (obj.type === 'good') {
    playSound('good')
    goodHits.value += 1
    combo.value += 1
    const base = 10
    const comboBonus = (combo.value - 1) * 2
    score.value += base + comboBonus
    if (combo.value > bestCombo.value) {
      bestCombo.value = combo.value
    }
  } else {
    playSound('bad')
    badHits.value += 1
    score.value -= 50
    combo.value = 0
  }
}

const handleBackgroundClick = () => {
  if (gameState.value !== 'playing') return
  missClicks.value += 1
  score.value -= 5
  combo.value = 0
  playSound('miss')
}

const submitScore = () => {
  emit('finish', score.value)
}

onBeforeUnmount(() => {
  clearIntervals()
})
</script>

<style scoped lang="scss">
.precision-game {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 700px;
  width: 100%;
  min-height: 420px;
  display: flex;
  flex-direction: column;
}

.game-header {
  text-align: center;
  margin-bottom: 16px;
}

.game-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.game-instructions {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.game-stats {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.stat-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-label {
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  color: #111827;
  font-weight: 700;
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intro-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.intro-text {
  max-width: 420px;
  text-align: center;
  font-size: 14px;
  color: #4b5563;
}

.play-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.play-area {
  flex: 1;
  position: relative;
  border-radius: 16px;
  background: #f3f4f6;
  overflow: hidden;
  cursor: crosshair;
}

.target {
  position: absolute;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 2px solid rgba(15, 23, 42, 0.08);
  cursor: inherit;
  transform: translate(-50%, -50%);
  box-shadow: none;
  transition: transform 0.08s, opacity 0.08s;

  &--good {
    background: #16a34a;
  }

  &--bad {
    background: #ef4444;
  }

  &--popping {
    transform: translate(-50%, -50%) scale(0.6);
    animation: pop-in 0.15s ease-out forwards;
  }

  &:active {
    transform: translate(-50%, -50%) scale(0.9);
  }

  &--good:active {
    background: #15803d;
  }

  &--bad:active {
    background: #b91c1c;
  }
}

@keyframes pop-in {
  from {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0;
  }

  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

.hint-line {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
}

.game-finished {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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

.score-details {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn {
  padding: 12px 28px;
  border-radius: 999px;
  border: none;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 10px 25px rgba(79, 70, 229, 0.45);
  transition: transform 0.15s, box-shadow 0.15s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 30px rgba(79, 70, 229, 0.55);
  }
}
</style>
