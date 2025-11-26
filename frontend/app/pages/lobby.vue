<template>
  <div class="lobby">
    <div class="lobby-container">
      <h1 class="lobby-title">Salle d'attente</h1>
      <p class="lobby-subtitle">Partage le code avec tes amis puis démarre la partie</p>

      <div class="lobby-card">
        <div class="lobby-header">
          <div>
            <p class="lobby-room-code-label">Code de la partie</p>
            <div class="lobby-room-code-row">
              <span class="lobby-room-code">{{ roomCode }}</span>
              <button type="button" class="btn btn-copy" @click="copyRoomCode">
                Copier le code
              </button>
            </div>
          </div>
        </div>

        <div class="lobby-section">
          <p class="lobby-section-title">Joueurs connectés</p>
          <ul class="players-list">
            <li v-for="player in players" :key="player.id" class="player-item">
              <div class="player-main">
                <PlayerPawn :player="{ id: player.id, name: player.name, color: player.color, avatar: player.avatar }"
                  :size="28" />
                <span class="player-name">{{ player.name }}</span>
              </div>

              <div v-if="player.id === playerId" class="color-picker">
                <span class="color-label">Couleur :</span>
                <input type="color" v-model="colorInput" class="color-native" @change="onColorInputChange" />
                <input v-model="colorInput" class="color-input" placeholder="#ff0000" @change="onColorInputChange" />
              </div>
            </li>
          </ul>
          <p v-if="players.length === 0" class="lobby-empty">En attente de joueurs...</p>
        </div>

        <div v-if="isHost" class="lobby-footer">
          <button type="button" class="btn btn-primary lobby-start-btn" @click="startGame">
            Démarrer la partie
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameState } from '../../composables/useGameState'
import PlayerPawn from '../components/board/PlayerPawn.vue'

const route = useRoute()

const roomCode = ((route.query.room as string | undefined) ?? 'default-room') as string

const getLocalStorage = (key: string, defaultValue: string): string => {
  if (typeof window === 'undefined') return defaultValue
  return localStorage.getItem(key) ?? defaultValue
}

const playerName = getLocalStorage('playerName', 'Host')
const playerId = getLocalStorage('playerId', 'host-' + Math.random().toString(36).slice(2))
const defaultColor = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#6366f1'][Math.floor(Math.random() * 5)]

const colorInput = ref(defaultColor)

const { gameState, socket, changeColor } = useGameState(roomCode, playerId, playerName, defaultColor)

const players = computed(() => gameState.value?.players || [])
const isHost = computed(() => gameState.value?.currentTurnPlayerId === playerId)

const normalizedColor = computed(() => {
  const value = colorInput.value.trim()
  if (!value) return defaultColor

  const withHash = value.startsWith('#') ? value : `#${value}`
  const isValid = /^#[0-9a-fA-F]{6}$/.test(withHash)
  return isValid ? withHash : defaultColor
})

const copyRoomCode = async () => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(roomCode)
    } catch (e) {
      console.error('Failed to copy room code', e)
    }
  }
}

const startGame = () => {
  if (!socket.value || !isHost.value) return
  socket.value.emit('startGame', { roomId: roomCode, playerId })
}

const onColorInputChange = () => {
  const value = normalizedColor.value
  changeColor(value)
}

watch(
  () => gameState.value?.status,
  async (status) => {
    if (status === 'playing') {
      await navigateTo(`/board?room=${roomCode}`)
    }
  },
)
</script>

<style scoped lang="scss">
.lobby {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lobby-container {
  max-width: 640px;
  width: 100%;
}

.lobby-title {
  font-size: 36px;
  font-weight: 800;
  color: white;
  text-align: left;
  margin: 0 0 6px 0;
}

.lobby-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 20px 0;
}

.lobby-card {
  background: white;
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.lobby-header {
  margin-bottom: 16px;
}

.lobby-room-code-label {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 4px 0;
}

.lobby-room-code-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lobby-room-code {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.18em;
  padding: 8px 14px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
}

.lobby-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  margin-top: 4px;
}

.lobby-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.players-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
}

.player-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.player-name {
  font-size: 14px;
  color: #111827;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-label {
  font-size: 12px;
  color: #6b7280;
}

.color-native {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
}

.color-input {
  width: 96px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  font-size: 13px;
  font-family: inherit;
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: none;
}

.lobby-start-btn {
  width: auto;
}

.lobby-empty {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.lobby-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn {
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
  }
}

.btn-copy {
  background: #eef2ff;
  color: #4f46e5;

  &:hover {
    background: #e0e7ff;
  }
}
</style>
