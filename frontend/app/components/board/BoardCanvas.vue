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
          <BonusPanel :current-player="realCurrentPlayer" :is-my-turn="isMyTurn" @use-bonus="handleUseBonus" />

          <GameControls :is-my-turn="isMyTurn" :is-on-key-shop="isOnKeyShop" :can-buy-key="canBuyKey"
            :key-shop-price="keyShopPrice" :last-dice-roll="isDoubleDiceMode ? null : lastDiceRoll" :roll-id="rollId"
            @roll-dice="handleRollDice" @buy-key="buyKey" />

          <div v-if="isDoubleDiceMode && doubleDiceValues.length === 2" class="double-dice-panel">
            <p class="double-dice-text">Choisis le résultat que tu veux utiliser :</p>
            <div class="double-dice-list">
              <button v-for="(val, idx) in doubleDiceValues" :key="`dd-${idx}`" class="double-dice-button"
                @click="handleDoubleDiceChoice(val)">
                <DiceD6 :value="val as 1 | 2 | 3 | 4 | 5 | 6" :roll-id="rollId"
                  :background-color="idx === 0 ? '#6366f1' : '#6366f1'" />
              </button>
            </div>
          </div>

          <div v-if="isSwapMode" class="swap-panel">
            <p class="swap-text">Choisis un joueur avec qui échanger de position :</p>
            <ul class="swap-list">
              <li v-for="p in otherPlayers" :key="p.id" class="swap-item">
                <span class="swap-player-name" :style="{ color: p.color }">{{ p.name }}</span>
                <button class="swap-btn swap-btn--ghost" type="button" @click="centerOnPlayer(p)">
                  Centrer sur
                </button>
                <button class="swap-btn swap-btn--primary" type="button" @click="confirmSwap(p)">
                  Échanger
                </button>
              </li>
            </ul>
          </div>
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
import DiceD6 from '../dices/dice-d6.vue';
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
  rollDiceWithResult: rollGameDiceWithResult,
  movePlayer,
  buyKey,
  useBonus: useBonusAction,
  swapPlayers,
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

const isDoubleDiceMode = ref(false)
const isTeleportMode = ref(false)
const isSwapMode = ref(false)

const handleUseBonus = (bonusId: string) => {
  const current = realCurrentPlayer.value
  if (!current) {
    useBonusAction(bonusId)
    return
  }

  const bonus = current.bonuses.find(b => b.id === bonusId)
  if (!bonus) {
    useBonusAction(bonusId)
    return
  }

  if (bonus.type === 'teleport') {
    if (isTeleportMode.value) {
      isTeleportMode.value = false
      return
    }
    isTeleportMode.value = true
    isSwapMode.value = false
    useBonusAction(bonusId)
    return
  }

  if (bonus.type === 'swap') {
    if (isSwapMode.value) {
      isSwapMode.value = false
      return
    }
    isSwapMode.value = true
    isTeleportMode.value = false
    useBonusAction(bonusId)
    return
  }

  useBonusAction(bonusId)
}

const handleRollDice = () => {
  if (!isMyTurn.value) {
    console.warn('Ce n\'est pas votre tour!')
    return
  }

  if (realCurrentPlayer.value?.activeBonuses?.doubleDice) {
    isDoubleDiceMode.value = true
    rollDice(2, 6)
    return
  }

  rollGameDice()
}

const doubleDiceValues = computed(() => {
  if (!isDoubleDiceMode.value) return []
  return diceValues.value.slice(0, 2)
})

const handleDoubleDiceChoice = (value: number) => {
  if (!isMyTurn.value) return
  if (!isDoubleDiceMode.value) return

  rollGameDiceWithResult(value)

  isDoubleDiceMode.value = false
}

const closeMinigame = () => {
  isMinigameOpen.value = false
  isMinigameInitiator.value = false
}

const handleSubmitScore = (score: number) => {
  console.log('🎮 Submitting score:', score)

  if (gameConnected.value && socket.value) {
    socket.value.emit('minigameScore', {
      roomId: roomId.value,
      playerId: playerId.value,
      score: score
    })
  }
}

watch(lastDiceResult, (result) => {
  if (result !== null && lastDicePlayerId.value === playerId.value) {
    diceValues.value = [result]
    rollId.value++
  }
})

const handleGameSelected = (gameId: string) => {
  console.log('🎮 Minigame selected:', gameId)

  if (!socket.value || !gameConnected.value) return

  socket.value.emit('minigameStart', {
    roomId: roomId.value,
    playerId: playerId.value,
    gameType: gameId,
  })
}

watch(lastTileEffect, (effect) => {
  console.log('🎮 lastTileEffect changed:', effect)
  if (effect && effect.type === 'minigame') {
    console.log('🎮 Minigame tile reached, opening selection for initiator')
    isMinigameInitiator.value = true
    isMinigameOpen.value = true
    lastTileEffect.value = null
  }
})

watch(minigameActive, (active) => {
  console.log('🎮 minigameActive changed:', active)
  if (active) {
    console.log('🎮 Opening minigame overlay for all players!')
    isMinigameOpen.value = true
  }
})

const lastDiceRoll = computed(() => {
  if (diceValues.value.length > 0) {
    return diceValues.value[0] as 1 | 2 | 3 | 4 | 5 | 6
  }
  return null
})

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

const gamePlayers = computed<GamePlayer[]>(() => {
  if (gameState.value && gameState.value.players.length > 0) {
    return gameState.value.players
  }

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

const otherPlayers = computed(() => {
  if (!gameState.value) return []
  return gameState.value.players.filter(p => p.id !== playerId.value)
})

const animatedPositions = ref<Map<string, number>>(new Map())
const isAnimating = ref<Map<string, boolean>>(new Map())
const instantMovePlayers = ref<Set<string>>(new Set())

watch(gameState, (newState, oldState) => {
  if (!newState) return

  for (const player of newState.players) {
    if (!animatedPositions.value.has(player.id)) {
      animatedPositions.value.set(player.id, player.position)
      isAnimating.value.set(player.id, false)
    } else {
      const currentAnimatedPos = animatedPositions.value.get(player.id)!
      const isCurrentlyAnimating = isAnimating.value.get(player.id) || false

      if (player.position !== currentAnimatedPos && !isCurrentlyAnimating) {
        if (instantMovePlayers.value.has(player.id)) {
          animatedPositions.value.set(player.id, player.position)
          isAnimating.value.set(player.id, false)
          instantMovePlayers.value.delete(player.id)
        } else {
          animatePlayerMovement(player.id, currentAnimatedPos, player.position)
        }
      }
    }
  }
}, { immediate: true, deep: true })

const animatePlayerMovement = (playerId: string, fromPos: number, toPos: number) => {
  const boardSize = gameState.value?.boardSize || 50

  isAnimating.value.set(playerId, true)

  let steps = toPos - fromPos
  if (steps < 0) {
    steps += boardSize
  }

  if (steps === 0) {
    isAnimating.value.set(playerId, false)
    return
  }

  const duration = steps * 250
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)

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
      animatedPositions.value.set(playerId, toPos)
      isAnimating.value.set(playerId, false)
    }
  }

  requestAnimationFrame(animate)
}

const playersByTile = computed(() => {
  const result = new Map<number, Player[]>()

  if (!gameState.value || gameState.value.players.length === 0) {
    return result
  }

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

const centerOnPosition = (tileId: number) => {
  const tile = props.board.tiles.find((t: Tile) => t.id === tileId)
  if (!tile) return

  const tileCenterX = offset + tile.x * tileSize + tileSize / 2
  const tileCenterY = offset + tile.y * tileSize + tileSize / 2

  const targetZoom = 2

  const containerCenterX = 400
  const containerCenterY = 400

  panX.value = (containerCenterX - tileCenterX * targetZoom) / targetZoom
  panY.value = (containerCenterY - tileCenterY * targetZoom) / targetZoom

  zoom.value = targetZoom
}

const focusTile = (tile: Tile, x: number, y: number) => {
  if (isPanning.value) return

  if (isTeleportMode.value && isMyTurn.value) {
    movePlayer(tile.id)
    isTeleportMode.value = false
    return
  }

  selectedTile.value = tile
  centerOnPosition(tile.id)
}

const centerOnPlayer = (player) => {
  centerOnPosition(player.position)
}

const confirmSwap = (player) => {
  if (!isMyTurn.value) return
  if (!isSwapMode.value) return

  instantMovePlayers.value.add(playerId.value)
  instantMovePlayers.value.add(player.id)

  swapPlayers(player.id)
  isSwapMode.value = false
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
