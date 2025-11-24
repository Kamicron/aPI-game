<template>
  <div class="board-canvas-wrapper">
    <div class="board-layout">
      <div class="sidebar sidebar--left">
        <GameStatus :current-player="currentGamePlayer" :players="gamePlayers"
          :current-turn-player-id="currentTurnPlayerId" />
      </div>

      <div class="main-content">
        <div class="board-canvas-container" @wheel.prevent="handleWheel" @mousedown="startPan" @mousemove="handlePan"
          @mouseup="endPan" @mouseleave="endPan">
          <div class="board-canvas-controls board-canvas-controls--overlay">
            <button @click.stop="zoomIn" class="zoom-btn" title="Zoom avant">+</button>
            <button @click.stop="resetZoom" class="zoom-btn" title="Réinitialiser">⟲</button>
            <button @click.stop="zoomOut" class="zoom-btn" title="Zoom arrière">−</button>
            <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
          </div>

          <div class="board-canvas" :style="canvasStyle">
            <BoardTile v-for="tile in board.tiles" :key="tile.id" :tile="tile" :left="offset + tile.x * tileSize"
              :top="offset + tile.y * tileSize" @click="focusTile" />

            <PlayerStack v-for="[tileId, players] in playersByTile" :key="`stack-${tileId}`" :players="players"
              :tile-x="board.tiles.find((t: Tile) => t.id === tileId)!.x"
              :tile-y="board.tiles.find((t: Tile) => t.id === tileId)!.y" :tile-size="tileSize" :offset="offset" />
          </div>
        </div>

        <div class="game-panel">
          <BonusPanel :current-player="realCurrentPlayer" :is-my-turn="isMyTurn" @use-bonus="useBonusAction" />

          <GameControls :is-my-turn="isMyTurn" :is-on-key-shop="isOnKeyShop" :can-buy-key="canBuyKey"
            :key-shop-price="keyShopPrice" :last-dice-roll="lastDiceRoll" :roll-id="rollId" @roll-dice="handleRollDice"
            @buy-key="buyKey" />
        </div>
      </div>

      <div class="sidebar sidebar--right">
        <ChatPanel :messages="chatMessages" :connected="connected" @send-message="sendChatMessage" />

        <TileInfoPanel :tile="selectedTile" :players-on-tile="playersOnSelectedTile" @close="selectedTile = null" />
      </div>
    </div>

    <!-- Mini-game Overlay -->
    <MinigameOverlay :is-open="isMinigameOpen" :player-info="playerInfo" :results="minigameResultsFromState"
      :minigame-type="minigameType" :is-initiator="isMinigameInitiator" @close="closeMinigame"
      @submit-score="handleSubmitScore" @game-selected="handleGameSelected" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { Board, Tile } from '../../../composables/useBoard';
import { useGameChat } from '../../../composables/useGameChat';
import { useGameState } from '../../../composables/useGameState';
import { useRollDice } from '../../../composables/useRollDice';
import BoardTile from './BoardTile.vue';
import GameStatus, { type GamePlayer } from './GameStatus.vue';
import type { Player } from './PlayerPawn.vue';
import PlayerStack from './PlayerStack.vue';
import BonusPanel from './BonusPanel.vue';
import GameControls from './GameControls.vue';
import ChatPanel from './ChatPanel.vue';
import TileInfoPanel from './TileInfoPanel.vue';
import MinigameOverlay from './minigames/MinigameOverlay.vue';
import type { MinigameResult } from './minigames/MinigameResults.vue';

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

// Récupérer les infos depuis l'URL et le localStorage (côté client uniquement)
const roomId = ref((route.query.room as string) || (typeof window !== 'undefined' ? localStorage.getItem('roomCode') : null) || 'game-room-1')
const playerId = ref((typeof window !== 'undefined' ? localStorage.getItem('playerId') : null) || `player-${Math.random().toString(36).slice(2, 8)}`)
const playerName = ref((typeof window !== 'undefined' ? localStorage.getItem('playerName') : null) || `Joueur ${Math.floor(Math.random() * 1000)}`)
const playerColor = ref(['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#6366f1'][Math.floor(Math.random() * 5)])

const { messages: chatMessages, connected: chatConnected, sendMessage: sendChatMessage, notifyRoll } = useGameChat(roomId, playerId)

// Connexion au jeu via WebSocket
const {
  socket,
  connected: gameConnected,
  gameState,
  currentPlayer: realCurrentPlayer,
  isMyTurn,
  lastDiceResult,
  lastDicePlayerId,
  lastTileEffect,
  minigameActive,
  minigameType,
  minigameResults: minigameResultsFromState,
  rollDice: rollGameDice,
  movePlayer,
  buyKey,
  useBonus: useBonusAction
} = useGameState(roomId.value, playerId.value, playerName.value, playerColor.value || '#6366f1')

const connected = computed(() => chatConnected.value && gameConnected.value)

// Mini-game state
const isMinigameOpen = ref(false)
const isMinigameInitiator = ref(false)
const playerInfo = computed(() => ({
  id: playerId.value,
  name: playerName.value,
  color: playerColor.value || '#6366f1'
}))

const handleRollDice = () => {
  if (!isMyTurn.value) {
    console.warn('Ce n\'est pas votre tour!')
    return
  }
  rollGameDice()
}

const closeMinigame = () => {
  isMinigameOpen.value = false
  isMinigameInitiator.value = false
}

const handleSubmitScore = (score: number) => {
  console.log('🎮 Submitting score:', score)

  // Envoyer le score au backend
  if (gameConnected.value && socket.value) {
    socket.value.emit('minigameScore', {
      roomId: roomId.value,
      playerId: playerId.value,
      score: score
    })
  }
}

// Surveiller les événements de dés pour l'animation
watch(lastDiceResult, (result) => {
  if (result !== null && lastDicePlayerId.value === playerId.value) {
    diceValues.value = [result]
    rollId.value++
  }
})

const handleGameSelected = (gameId: string) => {
  console.log('🎮 Minigame selected:', gameId)

  // L'initiateur envoie le type de mini-jeu choisi au backend
  if (!socket.value || !gameConnected.value) return

  socket.value.emit('minigameStart', {
    roomId: roomId.value,
    playerId: playerId.value,
    gameType: gameId,
  })
}

// Surveiller les effets de tuiles pour démarrer le mini-jeu (seulement pour l'initiateur)
watch(lastTileEffect, (effect) => {
  console.log('🎮 lastTileEffect changed:', effect)
  if (effect && effect.type === 'minigame') {
    console.log('🎮 Minigame tile reached, opening selection for initiator')
    // Ce joueur est l'initiateur du mini-jeu : il choisit le jeu
    isMinigameInitiator.value = true
    isMinigameOpen.value = true
    // Réinitialiser l'effet pour permettre un nouveau déclenchement plus tard
    lastTileEffect.value = null
  }
})

// Surveiller l'activation du mini-jeu (pour TOUS les joueurs)
watch(minigameActive, (active) => {
  console.log('🎮 minigameActive changed:', active)
  if (active) {
    console.log('🎮 Opening minigame overlay for all players!')
    // L'overlay doit être ouvert pour tous les joueurs pendant le mini-jeu
    isMinigameOpen.value = true
  }
})

const lastDiceRoll = computed(() => {
  if (diceValues.value.length > 0) {
    return diceValues.value[0] as 1 | 2 | 3 | 4 | 5 | 6
  }
  return null
})

// Vérifier si le joueur est sur une boutique de clés
const isOnKeyShop = computed(() => {
  if (!realCurrentPlayer.value || !props.board) return false
  const currentTile = props.board.tiles.find((t: Tile) => t.id === realCurrentPlayer.value?.position)
  return currentTile?.kind === 'key_shop'
})

const keyShopPrice = computed(() => {
  if (!realCurrentPlayer.value || !props.board) return 100
  const currentTile = props.board.tiles.find((t: Tile) => t.id === realCurrentPlayer.value?.position)
  return currentTile?.keyPrice || 100
})

const canBuyKey = computed(() => {
  return !!(isOnKeyShop.value && realCurrentPlayer.value && realCurrentPlayer.value.coins >= keyShopPrice.value)
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

const playersOnSelectedTile = computed(() => {
  if (!gameState.value || !selectedTile.value) return []
  return gameState.value.players.filter(p => p.position === selectedTile.value!.id)
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
</script>

<style scoped lang="scss">
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
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  border-radius: 9 px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);

  &.board-canvas-controls--overlay {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 20;
  }
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background:
    radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.08), transparent 55%),
    linear-gradient(135deg, #064e3b 0%, #047857 40%, #0f766e 100%);
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

.game-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
</style>
