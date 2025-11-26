<template>
  <div class="arcade-page">
    <div class="arcade-layout">
      <div class="arcade-left">
        <h1 class="arcade-title">Mode Arcade</h1>
        <p class="arcade-subtitle">Enchaînez les mini-jeux sans plateau.</p>

        <div class="arcade-controls">
          <div class="arcade-mode-switch">
            <span class="label">SÉQUENCE</span>
            <button type="button" class="mode-chip" :class="{ 'mode-chip--active': sequenceMode === 'random' }"
              @click="sequenceMode = 'random'">
              Aléatoire
            </button>
            <button type="button" class="mode-chip" :class="{ 'mode-chip--active': sequenceMode === 'manual' }"
              @click="sequenceMode = 'manual'">
              Choix manuel
            </button>
          </div>

          <div v-if="sequenceMode === 'manual'" class="arcade-search">
            <input v-model="searchQuery" type="text" class="search-input"
              placeholder="Rechercher un mini-jeu (réaction, mémoire, bomberman, ...)" />
          </div>

          <!-- En mode aléatoire, seul l'hôte peut lancer le premier mini-jeu -->
          <div v-if="sequenceMode === 'random'" class="arcade-random-actions">
            <button v-if="isHost" type="button" class="game-play-btn" @click="startRandomGame">
              Lancer un mini-jeu aléatoire
            </button>
            <span v-else class="game-play-hint">En attente que l'hôte lance un mini-jeu aléatoire</span>
          </div>
        </div>

        <div v-if="sequenceMode === 'manual'" class="arcade-games-list">
          <h2 class="section-title">Mini-jeux disponibles</h2>
          <ul class="games-list">
            <li v-for="game in filteredGames" :key="game.id" class="game-item">
              <div class="game-main">
                <span class="game-icon">{{ game.icon }}</span>
                <div class="game-text">
                  <span class="game-name">{{ game.name }}</span>
                  <span class="game-description">{{ game.description }}</span>
                </div>
              </div>

              <!-- Seul l'hôte peut vraiment lancer un mini-jeu -->
              <button v-if="isHost" type="button" class="game-play-btn" @click="startSelectedGame(game.id)">
                Lancer
              </button>
              <span v-else class="game-play-hint">Seul l'hôte peut lancer</span>
            </li>
          </ul>
        </div>

        <div class="arcade-scoreboard">
          <h2 class="section-title">Classement de la session</h2>
          <p v-if="sortedSessionScores.length === 0" class="empty-text">
            Aucun mini-jeu terminé pour l'instant.
          </p>
          <ul v-else class="score-list">
            <li v-for="(entry, index) in sortedSessionScores" :key="entry.playerId" class="score-item">
              <span class="score-rank">#{{ index + 1 }}</span>
              <span class="score-name" :style="{ color: entry.color }">{{ entry.name }}</span>
              <span class="score-value">{{ entry.totalCoins }} 💰</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="arcade-right">
        <div class="arcade-right-layout">
          <div class="players-card">
            <h2 class="players-title">Joueurs connectés</h2>
            <ul class="players-list">
              <li v-for="player in gamePlayers" :key="player.id" class="player-row">
                <span class="player-dot" :style="{ backgroundColor: player.color }" />
                <span class="player-name">{{ player.name }}</span>
                <span v-if="player.id === hostPlayerId" class="player-tag">Hôte</span>
                <span v-else-if="player.id === playerId" class="player-tag">Moi</span>
              </li>
            </ul>
          </div>

          <div class="chat-card">
            <ChatPanel :messages="chatMessages" :connected="connected" @send-message="sendChatMessage" />
          </div>

          <MinigameOverlay :is-open="isMinigameOpen" :player-info="playerInfo" :results="minigameResultsFromState"
            :minigame-type="minigameType" :is-initiator="isMinigameInitiator" @close="handleOverlayClose"
            @submit-score="handleSubmitScore" @game-selected="handleGameSelected" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MinigameOverlay from '../components/board/minigames/MinigameOverlay.vue'
import type { MinigameResult } from '../components/board/minigames/MinigameResults.vue'
import { useGameState } from '../../composables/useGameState'
import { useGameChat } from '../../composables/useGameChat'
import ChatPanel from '../components/board/ChatPanel.vue'

const route = useRoute()

// Identifiants de room / joueur (similaire à BoardCanvas)
const roomId = ref(
  (route.query.room as string) ||
  (typeof window !== 'undefined' ? localStorage.getItem('roomCode') : null) ||
  'game-room-1',
)
const playerId = ref(
  (typeof window !== 'undefined' ? localStorage.getItem('playerId') : null) ||
  `player-${Math.random().toString(36).slice(2, 8)}`,
)
const playerName = ref(
  (typeof window !== 'undefined' ? localStorage.getItem('playerName') : null) ||
  `Joueur ${Math.floor(Math.random() * 1000)}`,
)
const playerColor = ref(
  (typeof window !== 'undefined' ? localStorage.getItem('playerColor') : null) ||
  ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#6366f1'][
  Math.floor(Math.random() * 5)
  ],
)

const {
  socket,
  gameState,
  connected: gameConnected,
  minigameActive,
  minigameType,
  minigameResults: minigameResultsFromState,
  bombermanMap,
} = useGameState(roomId.value, playerId.value, playerName.value, playerColor.value || '#6366f1')

// Rendre les infos utiles aux mini-jeux (dont Bomberman)
provide('roomId', roomId)
provide('currentPlayerId', playerId)
provide('players', computed(() => gameState.value?.players ?? []))
provide('socket', socket)
provide('bombermanMap', bombermanMap)

const isMinigameOpen = ref(false)
const isMinigameInitiator = ref(false)

const playerInfo = computed(() => ({
  id: playerId.value,
  name: playerName.value,
  color: playerColor.value || '#6366f1',
}))

// Hôte fourni par le backend via hostPlayerId (créateur de la room)
const hostPlayerId = computed(() => gameState.value?.hostPlayerId || '')
const isHost = computed(() => hostPlayerId.value === playerId.value)

// Mode de séquence (aléatoire / manuel)
const sequenceMode = ref<'random' | 'manual'>('random')
const searchQuery = ref('')

interface ArcadeGameInfo {
  id: string
  name: string
  icon: string
  description: string
}

// Liste simple des mini-jeux disponibles (en phase avec MinigameOverlay)
const allGames: ArcadeGameInfo[] = [
  {
    id: 'reaction',
    name: 'Réflexes éclair',
    icon: '⚡',
    description: 'Clique le plus vite possible quand le bouton devient vert !',
  },
  {
    id: 'memory',
    name: 'Mémoire',
    icon: '🧠',
    description: 'Mémorise la séquence de couleurs',
  },
  {
    id: 'precision',
    name: 'Précision',
    icon: '🎯',
    description: 'Clique sur les cibles qui apparaissent',
  },
  {
    id: 'bomberman',
    name: 'Bomberman',
    icon: '💣',
    description: 'Déplace-toi dans une arène remplie de blocs destructibles',
  },
  {
    id: 'farkle',
    name: 'Farkle',
    icon: '🎲',
    description: 'Accumule des points en lançant les dés sans tout perdre',
  },
]

const filteredGames = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return allGames
  return allGames.filter((g) => {
    return (
      g.id.toLowerCase().includes(q) ||
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    )
  })
})

// Cumul de la session (on additionne les coins gagnes sur chaque mini-jeu)
interface SessionScoreEntry {
  playerId: string
  name: string
  color: string
  totalCoins: number
}

const sessionScores = ref<Map<string, SessionScoreEntry>>(new Map())

const sortedSessionScores = computed(() => {
  return Array.from(sessionScores.value.values()).sort(
    (a, b) => b.totalCoins - a.totalCoins,
  )
})

// Quand des resultats arrivent depuis le backend, mettre e jour le cumul
watch(
  () => minigameResultsFromState.value,
  (results: MinigameResult[] | null | undefined) => {
    if (!results || results.length === 0) return

    for (const r of results) {
      const existing = sessionScores.value.get(r.playerId)
      const coins = r.coinsEarned ?? 0
      if (existing) {
        existing.totalCoins += coins
      } else {
        sessionScores.value.set(r.playerId, {
          playerId: r.playerId,
          name: r.playerName,
          color: r.playerColor,
          totalCoins: coins,
        })
      }
    }
  },
  { deep: true },
)

// Liste simple des joueurs pour affichage
const gamePlayers = computed(() => gameState.value?.players ?? [])

// Chat temps réel (même logique que BoardCanvas)
const { messages: chatMessages, connected: chatConnected, sendMessage: sendChatMessage } = useGameChat(
  roomId,
  playerId,
)

const connected = computed(() => chatConnected.value && gameConnected.value)

// Ouvrir / fermer l'overlay en fonction de minigameActive
watch(
  () => minigameActive.value,
  (active) => {
    if (active) {
      isMinigameOpen.value = true
    }
  },
)

// Démarrer un mini-jeu choisi dans la liste
const startSelectedGame = (gameId: string) => {
  if (!socket.value || !isHost.value) return
  isMinigameInitiator.value = true
  isMinigameOpen.value = true

  socket.value.emit('minigameStart', {
    roomId: roomId.value,
    playerId: playerId.value,
    gameType: gameId,
  })
}

// Handler appelé par MinigameOverlay quand un jeu est choisi sur son écran de sélection
const handleGameSelected = (gameId: string) => {
  if (!socket.value || !isHost.value) return
  socket.value.emit('minigameStart', {
    roomId: roomId.value,
    playerId: playerId.value,
    gameType: gameId,
  })
}

// Handler de score (transfert direct au backend, comme BoardCanvas)
const handleSubmitScore = (score: number) => {
  if (!socket.value) return

  socket.value.emit('minigameScore', {
    roomId: roomId.value,
    playerId: playerId.value,
    score,
  })
}

// Fonction utilitaire: lancer un mini-jeu aléatoire (utilisée pour le premier lancement et les suivants)
const startRandomGame = () => {
  if (!socket.value || !isHost.value) return

  const implementedGames = allGames
  if (implementedGames.length === 0) return
  const random = implementedGames[Math.floor(Math.random() * implementedGames.length)]

  socket.value.emit('minigameStart', {
    roomId: roomId.value,
    playerId: playerId.value,
    gameType: random.id,
  })

  isMinigameInitiator.value = true
  isMinigameOpen.value = true
}

// Quand l'overlay se ferme : en mode aléatoire, lancer automatiquement un nouveau mini-jeu
const handleOverlayClose = () => {
  isMinigameOpen.value = false
  isMinigameInitiator.value = false

  if (sequenceMode.value === 'random') {
    startRandomGame()
  }
}

onMounted(() => {
  // Quand on arrive sur la page arcade, ouvrir l'overlay si un mini-jeu est déjà actif
  if (minigameActive.value) {
    isMinigameOpen.value = true
  }
})
</script>

<style scoped lang="scss">
.arcade-page {
  min-height: 100vh;
  background: radial-gradient(circle at top, #1f2937 0%, #020617 55%);
  padding: 24px;
  color: #f9fafb;
}

.arcade-layout {
  display: grid;
  grid-template-columns: minmax(260px, 360px) 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.arcade-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.arcade-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
}

.arcade-subtitle {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #9ca3af;
}

.arcade-controls {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.arcade-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #9ca3af;
}

.mode-chip {
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  color: #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-chip--active {
  background: #4f46e5;
  border-color: #6366f1;
}

.arcade-search {
  margin-top: 2px;
}

.search-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  padding: 6px 10px;
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  font-size: 13px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 4px 0;
}

.arcade-games-list {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.games-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.game-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 6px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.game-item:hover {
  background: rgba(31, 41, 55, 0.9);
}

.game-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-icon {
  font-size: 22px;
}

.game-text {
  display: flex;
  flex-direction: column;
}

.game-name {
  font-size: 14px;
  font-weight: 600;
}

.game-description {
  font-size: 12px;
  color: #9ca3af;
}

.game-play-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 12px;
  font-size: 12px;
  background: #22c55e;
  color: #022c22;
  cursor: pointer;
  font-weight: 600;
}

.arcade-scoreboard {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.empty-text {
  font-size: 12px;
  color: #9ca3af;
}

.score-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.score-rank {
  width: 24px;
  font-weight: 700;
}

.score-name {
  flex: 1;
}

.score-value {
  font-weight: 600;
}

.arcade-right {
  position: relative;
  min-height: 480px;
}
</style>
