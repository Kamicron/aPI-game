import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export type BonusType = 
  | 'double_dice' | 'extra_turn' | 'teleport' | 'precision'  // Commun
  | 'shield' | 'safe' | 'swap' | 'multiplier'  // Rare
  | 'jackpot' | 'free_key' | 'lucky'  // Légendaire

export type BonusRarity = 'common' | 'rare' | 'legendary'

export interface Bonus {
  id: string
  type: BonusType
  rarity: BonusRarity
  name: string
  icon: string
  effect: string
}

export interface Player {
  id: string
  name: string
  color: string
  position: number
  coins: number
  keys: number
  bonuses: Bonus[]
  avatar?: string
  activeBonuses?: {
    shield?: boolean
    safe?: number
    multiplier?: number
    lucky?: number
    doubleDice?: boolean
  }
}

export interface GameState {
  roomId: string
  players: Player[]
  currentTurnPlayerId: string
  board: any
  boardSize: number
  status: 'waiting' | 'playing' | 'finished'
  winner?: string
}

export function useGameState(roomId: string, playerId: string, playerName: string, playerColor: string) {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  const gameState = ref<GameState | null>(null)
  const lastDiceResult = ref<number | null>(null)
  const lastDicePlayerId = ref<string | null>(null)
  const lastTileEffect = ref<{ type: string; message: string } | null>(null)
  const minigameActive = ref(false)
  const minigameType = ref<string | null>(null)
  const minigameResults = ref<any[] | null>(null)
  const bombermanMap = ref<any | null>(null)
  
  const currentPlayer = computed(() => {
    return gameState.value?.players.find(p => p.id === playerId) || null
  })
  const isMyTurn = computed(() => {
    return gameState.value?.currentTurnPlayerId === playerId
  })

  const connect = () => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
    
    socket.value = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socket.value.on('connect', () => {
      console.log('Connected to game server')
      connected.value = true
      
      // Rejoindre la partie
      socket.value?.emit('joinGame', {
        roomId,
        playerId,
        playerName,
        playerColor,
      })
    })

    socket.value.on('disconnect', () => {
      console.log('Disconnected from game server')
      connected.value = false
    })

    socket.value.on('gameState', (state: GameState) => {
      console.log('Game state updated:', state)
      gameState.value = state
    })

    socket.value.on('playerJoined', (data: { playerId: string; playerName: string }) => {
      console.log('Player joined:', data)
    })

    socket.value.on('playerLeft', (data: { playerId: string; playerName?: string }) => {
      console.log('Player left:', data)
      // Le gameState sera mis à jour automatiquement
    })

    socket.value.on('diceRolled', (data: { playerId: string; result: number; newPosition: number; nextPlayerId: string; tileEffect?: any }) => {
      console.log('Dice rolled:', data)
      // Stocker le résultat du dé et l'ID du joueur
      lastDiceResult.value = data.result
      lastDicePlayerId.value = data.playerId
      
      // Vérifier si c'est notre joueur et s'il y a un effet de tuile
      if (data.playerId === playerId && data.tileEffect) {
        console.log('Tile effect detected:', data.tileEffect)
        // Utiliser le type de tuile directement
        if (data.tileEffect.tileType === 'minigame') {
          lastTileEffect.value = { type: 'minigame', message: data.tileEffect.message || 'Mini-jeu !' }
        }
      }
      
      // L'état du jeu sera mis à jour via l'événement 'gameState'
    })

    socket.value.on('playerMoved', (data: { playerId: string; position: number; nextPlayerId: string }) => {
      console.log('Player moved:', data)
    })

    socket.value.on('tileEffect', (data: { playerId: string; tileType: string; message: string }) => {
      console.log('Tile effect:', data)
      if (data.playerId === playerId) {
        lastTileEffect.value = { type: data.tileType, message: data.message }
      }
    })

    socket.value.on('minigameStarted', (data: { gameType: string; initiatorId: string; initiatorName: string }) => {
      console.log('🎮 Minigame started for everyone:', data)
      minigameActive.value = true
      minigameType.value = data.gameType
    })

    socket.value.on('minigamePlayerFinished', (data: { playerId: string; playerName: string; finishedCount: number; totalPlayers: number }) => {
      console.log('🎮 Player finished minigame:', data)
    })

    socket.value.on('minigameResults', (data: any[]) => {
      console.log('🎮 Minigame results received:', data)
      minigameResults.value = data
      // Réinitialiser après un délai
      setTimeout(() => {
        minigameActive.value = false
        minigameResults.value = null
        minigameType.value = null
      }, 6000)
    })

    socket.value.on('bombermanInit', (data: { roomId: string; map: any }) => {
      console.log('💣 Bomberman init received:', data)
      bombermanMap.value = data.map
    })

    socket.value.on('connect_error', (error) => {
      console.error('Connection error:', error)
    })
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.emit('leaveGame', { roomId, playerId })
      socket.value.disconnect()
      socket.value = null
      connected.value = false
    }
  }

  const rollDice = () => {
    if (!socket.value) return
    socket.value.emit('rollDice', { roomId, playerId })
  }

  const rollDiceWithResult = (result: number) => {
    if (!socket.value) return
    socket.value.emit('rollDice', { roomId, playerId, result })
  }

  const movePlayer = (targetPosition: number) => {
    if (!socket.value) return
    socket.value.emit('movePlayer', { roomId, playerId, targetPosition })
  }

  const buyKey = () => {
    if (!socket.value) return
    socket.value.emit('buyKey', { roomId, playerId })
  }

  const swapPlayers = (targetPlayerId: string) => {
    if (!socket.value) return
    socket.value.emit('swapPlayers', { roomId, playerId, targetPlayerId })
  }

  const useBonus = (bonusId: string) => {
    if (!socket.value) return
    socket.value.emit('useBonus', { roomId, playerId, bonusId })
  }

  const changeColor = (color: string) => {
    if (!socket.value) return
    socket.value.emit('changeColor', { roomId, playerId, color })
  }

  const getGameState = () => {
    if (!socket.value) return
    if (!socket.value || !connected.value) {
      console.error('Not connected to game server')
      return
    }

    socket.value.emit('getGameState', { roomId })
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    connected,
    gameState,
    currentPlayer,
    isMyTurn,
    lastDiceResult,
    lastDicePlayerId,
    lastTileEffect,
    minigameActive,
    minigameType,
    minigameResults,
    bombermanMap,
    connect,
    disconnect,
    rollDice,
    rollDiceWithResult,
    movePlayer,
    buyKey,
    useBonus,
    swapPlayers,
    changeColor,
    getGameState,
  }
}
