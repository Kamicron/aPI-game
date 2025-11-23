import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

export interface Bonus {
  id: string
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
}

export interface GameState {
  roomId: string
  players: Player[]
  currentTurnPlayerId: string
  board: any
  status: 'waiting' | 'playing' | 'finished'
  winner?: string
}

export function useGameState(roomId: string, playerId: string, playerName: string, playerColor: string) {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  const gameState = ref<GameState | null>(null)
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

    socket.value.on('playerLeft', (data: { playerId: string }) => {
      console.log('Player left:', data)
    })

    socket.value.on('diceRolled', (data: { playerId: string; result: number }) => {
      console.log('Dice rolled:', data)
    })

    socket.value.on('playerMoved', (data: { playerId: string; position: number; nextPlayerId: string }) => {
      console.log('Player moved:', data)
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
    if (!socket.value || !connected.value) {
      console.error('Not connected to game server')
      return
    }

    if (!isMyTurn.value) {
      console.error('Not your turn')
      return
    }

    socket.value.emit('rollDice', { roomId, playerId })
  }

  const movePlayer = (targetPosition: number) => {
    if (!socket.value || !connected.value) {
      console.error('Not connected to game server')
      return
    }

    socket.value.emit('movePlayer', {
      roomId,
      playerId,
      targetPosition,
    })
  }

  const getGameState = () => {
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
    connect,
    disconnect,
    rollDice,
    movePlayer,
    getGameState,
  }
}
