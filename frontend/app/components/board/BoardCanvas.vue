<template>
  <div class="board-canvas-wrapper">
    <div class="board-canvas-controls">
      <button @click="zoomIn" class="zoom-btn" title="Zoom avant">+</button>
      <button @click="resetZoom" class="zoom-btn" title="Réinitialiser">⟲</button>
      <button @click="zoomOut" class="zoom-btn" title="Zoom arrière">−</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
    </div>

    <div class="board-layout">
      <div class="sidebar sidebar--left">
        <GameStatus :current-player="currentGamePlayer" :players="gamePlayers"
          :current-turn-player-id="currentTurnPlayerId" />
      </div>

      <div class="main-content">
        <div class="board-canvas-container" @wheel.prevent="handleWheel" @mousedown="startPan" @mousemove="handlePan"
          @mouseup="endPan" @mouseleave="endPan">
          <div class="board-canvas" :style="canvasStyle">
            <BoardTile v-for="tile in board.tiles" :key="tile.id" :tile="tile" :left="offset + tile.x * tileSize"
              :top="offset + tile.y * tileSize" @click="focusTile" />

            <PlayerStack v-for="[tileId, players] in playersByTile" :key="`stack-${tileId}`" :players="players"
              :tile-x="board.tiles.find((t: Tile) => t.id === tileId)!.x"
              :tile-y="board.tiles.find((t: Tile) => t.id === tileId)!.y" :tile-size="tileSize" :offset="offset" />
          </div>
        </div>

        <div class="game-panel">
          <button class="btn btn--primary" @click="handleRollDice" :disabled="!isMyTurn"
            :class="{ 'btn--disabled': !isMyTurn }">
            <span class="btn-icon">🎲</span>
            <span>{{ isMyTurn ? 'Lancer les dés' : 'Pas votre tour' }}</span>
          </button>
          <DiceD6 v-if="lastDiceRoll" :value="lastDiceRoll" :roll-id="rollId" background-color="#6366f1" />
          <div v-if="!isMyTurn && gameState" class="turn-info">
            <span class="turn-waiting">⏳ En attente...</span>
          </div>
        </div>
      </div>

      <div class="sidebar sidebar--right">
        <div class="panel panel--chat">
          <div class="panel-header">
            <h3 class="panel-title">💬 Chat</h3>
            <span class="status-indicator" :class="{ 'status-indicator--connected': connected }"></span>
          </div>
          <div class="panel-content panel-content--chat" ref="chatMessagesEl">
            <div v-for="(message, index) in chatMessages" :key="index" class="chat-message"
              :class="`chat-message--${message.type}`">
              <span v-if="message.type === 'user'" class="message-author">{{ message.authorId }}:</span>
              <span class="message-content">{{ message.content }}</span>
            </div>
          </div>
          <div class="panel-footer">
            <input v-model="newMessage" @keyup.enter="sendMessage" type="text" placeholder="Envoyer un message..."
              class="input" />
            <button @click="sendMessage" class="btn btn--icon">
              ➤
            </button>
          </div>
        </div>

        <div v-if="selectedTile" class="panel panel--tile-info">
          <div class="panel-header">
            <h3 class="panel-title">{{ getTileTitle(selectedTile) }}</h3>
            <button @click="selectedTile = null" class="btn-close">×</button>
          </div>

          <div class="panel-content">
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

              <div v-if="playersOnSelectedTile.length > 0" class="tile-info-players">
                <h4>Joueurs sur cette case :</h4>
                <div class="player-list">
                  <div v-for="player in playersOnSelectedTile" :key="player.id" class="player-item">
                    <div class="player-color" :style="{ backgroundColor: player.color }"></div>
                    <span class="player-name">{{ player.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Board, Tile } from '../../../composables/useBoard';
import { useGameChat } from '../../../composables/useGameChat';
import { useGameState } from '../../../composables/useGameState';
import { useRollDice } from '../../../composables/useRollDice';
import DiceD6 from '../dices/dice-d6.vue';
import BoardTile from './BoardTile.vue';
import GameStatus, { type GamePlayer } from './GameStatus.vue';
import type { Player } from './PlayerPawn.vue';
import PlayerStack from './PlayerStack.vue';

const props = defineProps<{
  board: Board
}>()

const size = 600
const tileSize = 64
const offset = 40

const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

const selectedTile = ref<Tile | null>(null)

const route = useRoute()
const { diceValues, rollId, roll: rollDice } = useRollDice()

// Récupérer les infos depuis l'URL et le localStorage
const roomId = ref((route.query.room as string) || localStorage.getItem('roomCode') || 'game-room-1')
const playerId = ref(localStorage.getItem('playerId') || `player-${Math.random().toString(36).slice(2, 8)}`)
const playerName = ref(localStorage.getItem('playerName') || `Joueur ${Math.floor(Math.random() * 1000)}`)
const playerColor = ref(['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#6366f1'][Math.floor(Math.random() * 5)])

const { messages: chatMessages, connected: chatConnected, sendMessage: sendChatMessage, notifyRoll } = useGameChat(roomId, playerId)

// Connexion au jeu via WebSocket
const {
  connected: gameConnected,
  gameState,
  currentPlayer: realCurrentPlayer,
  isMyTurn,
  lastDiceResult,
  lastDicePlayerId,
  rollDice: rollGameDice,
  movePlayer
} = useGameState(roomId.value, playerId.value, playerName.value, playerColor.value || '#6366f1')

const connected = computed(() => chatConnected.value && gameConnected.value)

const newMessage = ref('')
const chatMessagesEl = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

watch(chatMessages, () => {
  scrollToBottom()
}, { deep: true })

const handleRollDice = () => {
  if (!isMyTurn.value) {
    console.warn('Ce n\'est pas votre tour!')
    return
  }

  // Lancer les dés via WebSocket (le serveur génère le résultat)
  rollGameDice()
}

// Surveiller les événements de dés pour l'animation
watch(lastDiceResult, (result) => {
  if (result !== null && lastDicePlayerId.value === playerId.value) {
    // Animer le dé SEULEMENT pour le joueur qui a lancé
    diceValues.value = [result]
    rollId.value++
    
    // Notifier dans le chat
    notifyRoll([result])
  }
})

const sendMessage = () => {
  if (!newMessage.value.trim()) return
  sendChatMessage(newMessage.value)
  newMessage.value = ''
}

const lastDiceRoll = computed(() => {
  if (diceValues.value.length > 0) {
    return diceValues.value[0] as 1 | 2 | 3 | 4 | 5 | 6
  }
  return null
})

// Utiliser les vraies données du gameState ou fallback sur mock
const gamePlayers = computed<GamePlayer[]>(() => {
  if (gameState.value && gameState.value.players.length > 0) {
    return gameState.value.players
  }
  // Fallback mock data si pas encore connecté
  return [
    {
      id: playerId.value,
      name: playerName.value,
      color: playerColor.value || '#6366f1',
      coins: 150,
      keys: 3,
      bonuses: []
    }
  ]
})

const currentTurnPlayerId = computed(() => {
  return gameState.value?.currentTurnPlayerId || playerId.value
})

const currentGamePlayer = computed(() => {
  if (realCurrentPlayer.value) {
    return realCurrentPlayer.value
  }
  return gamePlayers.value.find(p => p.id === playerId.value) || gamePlayers.value[0]!
})

// Positions animées des joueurs (pour l'animation étape par étape)
const animatedPositions = ref<Map<string, number>>(new Map())
const isAnimating = ref<Map<string, boolean>>(new Map())

// Initialiser et surveiller les changements de position
watch(gameState, (newState, oldState) => {
  if (!newState) return

  // Initialiser les positions pour les nouveaux joueurs
  for (const player of newState.players) {
    if (!animatedPositions.value.has(player.id)) {
      animatedPositions.value.set(player.id, player.position)
      isAnimating.value.set(player.id, false)
    } else {
      // Détecter les changements de position
      const currentAnimatedPos = animatedPositions.value.get(player.id)!
      const isCurrentlyAnimating = isAnimating.value.get(player.id) || false
      
      // Animer seulement si la position a changé et qu'on n'est pas déjà en train d'animer
      if (player.position !== currentAnimatedPos && !isCurrentlyAnimating) {
        animatePlayerMovement(player.id, currentAnimatedPos, player.position)
      }
    }
  }
}, { immediate: true, deep: true })

// Fonction pour animer le déplacement avec une animation fluide
const animatePlayerMovement = (playerId: string, fromPos: number, toPos: number) => {
  const boardSize = gameState.value?.boardSize || 50

  // Marquer comme en cours d'animation
  isAnimating.value.set(playerId, true)

  // Calculer le chemin (gérer le plateau circulaire)
  let steps = toPos - fromPos
  if (steps < 0) {
    steps += boardSize // Gérer le retour au début
  }

  if (steps === 0) {
    isAnimating.value.set(playerId, false)
    return
  }

  // Animation fluide avec requestAnimationFrame
  const duration = steps * 250 // 250ms par case
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Fonction d'easing pour une animation plus naturelle
    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }

    const easedProgress = easeInOutCubic(progress)
    const currentStep = easedProgress * steps
    const currentPos = (fromPos + Math.floor(currentStep)) % boardSize

    animatedPositions.value.set(playerId, currentPos)

    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      // S'assurer que la position finale est exacte
      animatedPositions.value.set(playerId, toPos)
      isAnimating.value.set(playerId, false)
    }
  }

  requestAnimationFrame(animate)
}

// Mapper les positions animées aux tuiles du plateau
const playersByTile = computed(() => {
  const result = new Map<number, Player[]>()

  if (!gameState.value || gameState.value.players.length === 0) {
    return result
  }

  // Grouper les joueurs par position animée
  for (const player of gameState.value.players) {
    const tileId = animatedPositions.value.get(player.id) || player.position
    const tile = props.board.tiles.find((t: Tile) => t.id === tileId)

    if (tile) {
      const displayPlayer: Player = {
        id: player.id,
        name: player.name,
        color: player.color,
        avatar: player.avatar
      }

      if (!result.has(tileId)) {
        result.set(tileId, [])
      }
      result.get(tileId)!.push(displayPlayer)
    } else {
      console.warn(`Tile ${tileId} not found for player ${player.name}. Available tiles:`, props.board.tiles.map((t: Tile) => t.id))
    }
  }

  return result
})

const playersOnSelectedTile = computed(() => {
  if (!selectedTile.value) return []
  return playersByTile.value.get(selectedTile.value.id) || []
})

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

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newZoom = Math.max(0.5, Math.min(3, zoom.value + delta))

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const pointX = (mouseX - panX.value * zoom.value) / zoom.value
  const pointY = (mouseY - panY.value * zoom.value) / zoom.value

  panX.value = (mouseX - pointX * newZoom) / newZoom
  panY.value = (mouseY - pointY * newZoom) / newZoom

  zoom.value = newZoom
}

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

const focusTile = (tile: Tile, x: number, y: number) => {
  if (isPanning.value) return

  selectedTile.value = tile

  const tileCenterX = offset + x * tileSize + tileSize / 2
  const tileCenterY = offset + y * tileSize + tileSize / 2

  const targetZoom = 2

  const containerCenterX = 400
  const containerCenterY = 400

  panX.value = (containerCenterX - tileCenterX * targetZoom) / targetZoom
  panY.value = (containerCenterY - tileCenterY * targetZoom) / targetZoom

  zoom.value = targetZoom
}

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
:root {
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

.board-canvas-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  height: 100vh;
  overflow: hidden;
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
  width: 100%;
  height: 100%;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
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
  height: 500px;
}

.board-layout {
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 12px;
  height: calc(100vh - 120px);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
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
}

.panel-footer {
  display: flex;
  gap: 8px;
  padding: 10px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
    color: white;
    box-shadow: var(--shadow-sm);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #9ca3af !important;

    &:hover {
      transform: none !important;
      box-shadow: var(--shadow-sm) !important;
    }
  }

  &--icon {
    width: 44px;
    height: 44px;
    padding: 0;
    background: var(--primary-color);
    color: white;
    font-size: 18px;

    &:hover {
      background: var(--primary-hover);
    }
  }
}

.turn-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.turn-waiting {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.btn-icon {
  font-size: 20px;
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

.input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--primary-color);
  }
}

.game-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;

  &--connected {
    background: #10b981;
  }
}

.panel--tile-info {
  animation: slideIn 0.3s ease-out;
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

.tile-info-image {
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
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
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);

  .label {
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    font-weight: 700;
    font-size: 14px;
    color: var(--text-primary);

    &.positive {
      color: var(--success-color);
    }

    &.negative {
      color: var(--danger-color);
    }
  }
}

.tile-info-description {
  padding: 10px;
  background: #eef2ff;
  border-left: 3px solid var(--primary-color);
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
  margin-top: 8px;
}

.tile-info-players {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);

  h4 {
    margin: 0 0 8px 0;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-color);
    background: #eef2ff;
  }
}

.player-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.player-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.panel--chat {
  height: 300px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-content--chat {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--bg-secondary);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
}

.chat-message {
  padding: 8px 10px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  font-size: 12px;
  line-height: 1.4;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-color);
    background: #eef2ff;
  }

  &--system {
    background: #fffbeb;
    border-color: #fbbf24;
    font-style: italic;
    color: var(--text-secondary);

    &:hover {
      background: #fef3c7;
      border-color: #f59e0b;
    }
  }
}

.message-author {
  font-weight: 700;
  margin-right: 4px;
  color: var(--primary-color);
  font-size: 11px;
}

.message-content {
  color: var(--text-primary);
  font-size: 12px;
}
</style>
