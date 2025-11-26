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
              <button type="button" class="apg-btn apg-btn--outline lobby-copy-btn" @click="copyRoomCode">
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
          <div class="lobby-footer-left">
            <button type="button" class="settings-btn" title="Paramètres de la partie" @click="toggleSettings">
              ⚙
            </button>
          </div>

          <div class="lobby-footer-right">
            <button type="button" class="apg-btn apg-btn--primary lobby-start-btn" @click="startGame">
              Démarrer la partie
            </button>
          </div>
        </div>

        <!-- Panneau simple de paramètres de partie -->
        <div v-if="isHost && showSettings" class="lobby-settings-panel">
          <h3 class="settings-title">Paramètres de la partie</h3>

          <div class="settings-section">
            <p class="settings-label">Mode de jeu</p>
            <div class="settings-options">
              <label class="settings-option">
                <input v-model="gameMode" type="radio" value="board" />
                <span>Plateau (Party Game)</span>
              </label>
              <label class="settings-option">
                <input v-model="gameMode" type="radio" value="arcade" />
                <span>Mini-jeux enchaînés (Arcade)</span>
              </label>
            </div>
          </div>

          <div v-if="gameMode === 'arcade'" class="settings-section">
            <p class="settings-label">Séquence des mini-jeux</p>
            <div class="settings-options">
              <label class="settings-option">
                <input v-model="arcadeSequenceMode" type="radio" value="random" />
                <span>Aléatoire à chaque manche</span>
              </label>
              <label class="settings-option">
                <input v-model="arcadeSequenceMode" type="radio" value="manual" />
                <span>Choix manuel dans la liste</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { EToast } from 'vue3-modern-toast'
import { useGameState } from '../../composables/useGameState'
import PlayerPawn from '../components/board/PlayerPawn.vue'

const { $toast } = useNuxtApp()

function showToast() {
  $toast.show({
    message: 'Code copié dans le presse-papiers',
    type: EToast.SUCCESS,
    duration: 3000,
    dismissible: true,
  })
}
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
const copySuccess = ref(false)

const { gameState, socket, changeColor } = useGameState(roomCode, playerId, playerName, defaultColor)

const players = computed(() => gameState.value?.players || [])
// L'hôte est fourni par le backend via hostPlayerId (créateur de la room)
const isHost = computed(() => gameState.value?.hostPlayerId === playerId)

// Paramètres de partie (stockés localement pour l'instant)
const showSettings = ref(false)
const gameMode = ref<'board' | 'arcade'>('board')
const arcadeSequenceMode = ref<'random' | 'manual'>('random')

const normalizedColor = computed(() => {
  const value = colorInput.value.trim()
  if (!value) return defaultColor

  const withHash = value.startsWith('#') ? value : `#${value}`
  const isValid = /^#[0-9a-fA-F]{6}$/.test(withHash)
  return isValid ? withHash : defaultColor
})

const toggleSettings = () => {
  showSettings.value = !showSettings.value
}

const copyRoomCode = async () => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(roomCode)
      showToast()
    } catch (e) {
      console.error('Failed to copy room code', e)
    }
  }
}

const startGame = () => {
  if (!socket.value || !isHost.value) return

  socket.value.emit('startGame', {
    roomId: roomCode,
    playerId,
    mode: gameMode.value,
    arcadeSequenceMode: gameMode.value === 'arcade' ? arcadeSequenceMode.value : undefined,
  })
}

const onColorInputChange = () => {
  const value = normalizedColor.value
  changeColor(value)
}

watch(
  () => gameState.value?.status,
  async (status) => {
    if (status === 'playing') {
      const mode = (gameState.value as any)?.mode || 'board'
      if (mode === 'arcade') {
        await navigateTo(`/arcade?room=${roomCode}`)
      } else {
        await navigateTo(`/board?room=${roomCode}`)
      }
    }
  },
)
</script>

<style scoped lang="scss">
.lobby {
  min-height: 100vh;
  background: var(--apg-bg);
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
  color: var(--apg-text-main);
  text-align: left;
  margin: 0 0 6px 0;
}

.lobby-subtitle {
  font-size: 16px;
  color: var(--apg-text-muted);
  margin: 0 0 20px 0;
}

.lobby-card {
  background: var(--apg-surface);
  border-radius: $apg-radius-lg;
  padding: $apg-margin-xl $apg-margin-xl;
  box-shadow: var(--apg-shadow-soft);
  border: 1px solid var(--apg-border-subtle);
}

.lobby-header {
  margin-bottom: $apg-margin-md;
}

.lobby-room-code-label {
  font-size: $apg-font-size-sm;
  color: var(--apg-text-muted);
  margin: 0 0 4px 0;
}

.lobby-room-code-row {
  display: flex;
  align-items: center;
  gap: $apg-margin-md;
}

.lobby-room-code {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.18em;
  padding: 8px 14px;
  border-radius: $apg-radius-md;
  background: var(--apg-surface-alt);
  border: 1px dashed var(--apg-border-subtle);
  color: var(--apg-text-main);
}

.lobby-section {
  border-top: 1px solid var(--apg-border-subtle);
  padding-top: $apg-margin-md;
  margin-top: 4px;
}

.lobby-section-title {
  font-size: $apg-font-size-sm;
  font-weight: 600;
  color: var(--apg-text-main);
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
  color: var(--apg-text-main);
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-label {
  font-size: 12px;
  color: var(--apg-text-muted);
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
  border-radius: $apg-radius-md;
  border: 2px solid var(--apg-border-subtle);
  font-size: 13px;
  font-family: inherit;
  background: var(--apg-surface-alt);
  color: var(--apg-text-main);

  &::placeholder {
    color: var(--apg-text-soft);
  }
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

.lobby-footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lobby-footer-right {
  display: flex;
  align-items: center;
}

.settings-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: var(--apg-primary-soft);
  color: var(--apg-text-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;

  &:hover {
    background: var(--apg-primary);
    transform: translateY(-1px);
  }
}

.lobby-settings-panel {
  margin-top: $apg-margin-md;
  padding: $apg-margin-md $apg-margin-lg;
  border-radius: $apg-radius-md;
  background: var(--apg-surface-alt);
  border: 1px solid var(--apg-border-subtle);
}

.settings-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: var(--apg-text-main);
}

.settings-section {
  margin-bottom: 10px;
}

.settings-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--apg-text-muted);
  margin-bottom: 4px;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--apg-text-main);
}

.lobby-empty {
  margin-top: 4px;
  font-size: 13px;
  color: var(--apg-text-soft);
}

.lobby-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.lobby-copy-btn {
  width: auto;
  padding-inline: $apg-margin-lg;
}

.copy-toast {
  position: fixed;
  left: 50%;
  bottom: $apg-margin-xl;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: $apg-margin-sm;
  padding: $apg-margin-sm $apg-margin-lg;
  border-radius: $apg-radius-lg;
  background: var(--apg-surface-alt);
  color: var(--apg-text-main);
  box-shadow: var(--apg-shadow-soft);
  border: 1px solid var(--apg-border-subtle);
  font-size: $apg-font-size-sm;
}

.copy-toast__icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--apg-success);
  color: var(--apg-text-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.copy-toast-fade-enter-active,
.copy-toast-fade-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.copy-toast-fade-enter-from,
.copy-toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
