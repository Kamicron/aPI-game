<template>
  <Teleport to="body">
    <div v-if="isOpen" class="minigame-overlay">
      <div class="overlay-content">
        <!-- Sélection du jeu -->
        <div v-if="currentState === 'selection'" class="game-selection">
          <div class="selection-header">
            <h2 class="selection-title">🎮 Choisis ton Mini-Jeu</h2>
            <p class="selection-subtitle">Sélectionne un jeu parmi les 3 proposés</p>
          </div>

          <div class="games-grid">
            <div v-for="game in availableGames" :key="game.id" @click="selectGame(game)" class="game-card">
              <div class="game-icon">{{ game.icon }}</div>
              <h3 class="game-name">{{ game.name }}</h3>
              <p class="game-description">{{ game.description }}</p>
              <div class="game-difficulty">
                <span class="difficulty-label">Difficulté:</span>
                <span class="difficulty-stars">{{ '⭐'.repeat(game.difficulty) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Jeu en cours -->
        <div v-else-if="currentState === 'playing'" class="game-playing">
          <component :is="currentGameComponent" :key="gameKey" @finish="handleGameFinish" />
        </div>

        <!-- Attente des autres joueurs -->
        <div v-else-if="currentState === 'waiting'" class="game-waiting-results">
          <div class="waiting-card">
            <div class="waiting-spinner">⏳</div>
            <h3>En attente des autres joueurs...</h3>
            <p>Ton score a été enregistré !</p>
          </div>
        </div>

        <!-- Résultats -->
        <div v-else-if="currentState === 'results'" class="game-results">
          <MinigameResults :game-name="selectedGame?.name || ''" :results="gameResults" :score-label="selectedGame?.id === 'reaction'
            ? 'ms (moy.)'
            : selectedGame?.id === 'memory'
              ? 'niveau(x)'
              : selectedGame?.id === 'precision'
                ? 'points'
                : selectedGame?.id === 'farkle'
                  ? 'points'
                  : ''
            " @close="closeOverlay" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, watch } from 'vue'
import ReactionGame from './games/ReactionGame.vue'
import SimonGame from './games/SimonGame.vue'
import PrecisionGame from './games/PrecisionGame.vue'
import FarkleGame from './games/FarkleGame.vue'
import BomberGame from './games/BomberGame.vue'
import MinigameResults, { type MinigameResult } from './MinigameResults.vue'

interface MinigameInfo {
  id: string
  name: string
  icon: string
  description: string
  difficulty: number
  component: any
}

const props = defineProps<{
  isOpen: boolean
  playerInfo: {
    id: string
    name: string
    color: string
  }
  results?: MinigameResult[] | null
  minigameType?: string | null
  isInitiator?: boolean
}>()

const emit = defineEmits<{
  close: []
  'submit-score': [score: number]
  'game-selected': [gameId: string]
}>()

const currentState = ref<'selection' | 'playing' | 'results' | 'waiting'>('playing')
const selectedGame = ref<MinigameInfo | null>(null)
const gameResults = ref<MinigameResult[]>([])
const gameKey = ref(0) // Clé pour forcer la recréation du composant de jeu

// Liste de tous les jeux disponibles
const allGames: MinigameInfo[] = [
  {
    id: 'reaction',
    name: 'Réflexes Éclair',
    icon: '⚡',
    description: 'Clique le plus vite possible quand le bouton devient vert !',
    difficulty: 2,
    component: markRaw(ReactionGame)
  },
  // Futurs jeux à ajouter
  {
    id: 'memory',
    name: 'Mémoire',
    icon: '🧠',
    description: 'Mémorise la séquence de couleurs',
    difficulty: 3,
    component: markRaw(SimonGame)
  },
  {
    id: 'precision',
    name: 'Précision',
    icon: '🎯',
    description: 'Clique sur les cibles qui apparaissent',
    difficulty: 2,
    component: markRaw(PrecisionGame)
  },
  {
    id: 'bomberman',
    name: 'Bomberman',
    icon: '💣',
    description: 'Déplace-toi dans une arène remplie de blocs destructibles',
    difficulty: 3,
    component: markRaw(BomberGame)
  },
  {
    id: 'farkle',
    name: 'Farkle',
    icon: '🎲',
    description: 'Accumule des points en lançant les dés sans tout perdre',
    difficulty: 2,
    component: markRaw(FarkleGame)
  },
  {
    id: 'typing',
    name: 'Rapidité',
    icon: '⌨️',
    description: 'Tape les mots le plus vite possible',
    difficulty: 3,
    component: null // À implémenter
  },
  {
    id: 'luck',
    name: 'Chance',
    icon: '🍀',
    description: 'Choisis le bon coffre',
    difficulty: 1,
    component: null // À implémenter
  }
]

// Sélectionner 3 jeux aléatoires
const availableGames = ref<MinigameInfo[]>([])

const shuffleGames = () => {
  // Pour l'instant, on ne propose que les jeux implémentés
  const implementedGames = allGames.filter(g => g.component !== null)

  // Mélanger et prendre 3 (ou moins si pas assez de jeux)
  const shuffled = [...implementedGames].sort(() => Math.random() - 0.5)
  availableGames.value = shuffled.slice(0, Math.min(3, shuffled.length))
}

// Initialiser le jeu sélectionné (par défaut le jeu de réflexes)
selectedGame.value = allGames.find(g => g.id === 'reaction') || null

// Surveiller l'ouverture de l'overlay pour réinitialiser le jeu
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Incrémenter la clé pour forcer la recréation du composant
    gameKey.value++
    gameResults.value = []

    // Mélanger les jeux disponibles
    shuffleGames()

    // Si ce joueur est l'initiateur :
    // - s'il n'y a PAS de minigameType imposé, on lui laisse l'écran de sélection (cas party-game classique)
    // - s'il y a un minigameType imposé (cas arcade ou démarrage ciblé), on lance directement ce jeu.
    if (props.isInitiator && !props.minigameType) {
      currentState.value = 'selection'
      selectedGame.value = null
    } else {
      // Pour les autres joueurs, ou pour un initiateur avec minigameType imposé :
      // si un type de mini-jeu est imposé (vient du backend), le choisir directement
      if (props.minigameType) {
        const forcedGame = allGames.find(g => g.id === props.minigameType)
        if (forcedGame && forcedGame.component) {
          selectedGame.value = forcedGame
          currentState.value = 'playing'
          return
        }
      }

      // Par défaut, on tombe sur le jeu de réflexes
      selectedGame.value = allGames.find(g => g.id === 'reaction') || null
      currentState.value = 'playing'
    }
  }
})

// Surveiller les résultats venant du backend
watch(() => props.results, (results) => {
  if (results && results.length > 0) {
    console.log('🎮 Results received:', results)
    gameResults.value = results
    currentState.value = 'results'
  }
})

// Si un type de mini-jeu est imposé APRÈS l'ouverture de l'overlay
// (par exemple, l'initiateur a ouvert avant de recevoir minigameType),
// basculer directement sur ce jeu dès que l'info arrive.
watch(() => props.minigameType, (newType) => {
  if (!newType) return
  if (!props.isOpen) return

  const forcedGame = allGames.find(g => g.id === newType)
  if (forcedGame && forcedGame.component) {
    selectedGame.value = forcedGame
    currentState.value = 'playing'
  }
})

const currentGameComponent = computed(() => {
  return selectedGame.value?.component || null
})

const selectGame = (game: MinigameInfo) => {
  if (!game.component) {
    alert('Ce jeu n\'est pas encore disponible !')
    return
  }
  selectedGame.value = game
  currentState.value = 'playing'
  emit('game-selected', game.id)
}

const handleGameFinish = (score: number) => {
  console.log('🎮 Player finished with score:', score)

  // Envoyer le score au backend
  emit('submit-score', score)

  // Passer à l'état d'attente des autres joueurs
  currentState.value = 'waiting'
}

const calculateCoinsByRank = (rank: number): number => {
  // Distribution des pièces selon le classement
  if (rank === 1) return 5 // 1er place
  if (rank === 2) return 3 // 2ème place
  if (rank === 3) return 1 // 3ème place
  return 0 // Pas de récompense après la 3ème place
}

const closeOverlay = () => {
  // Réinitialiser complètement l'état du jeu
  currentState.value = 'playing'
  selectedGame.value = allGames.find(g => g.id === 'reaction') || null
  gameResults.value = []
  emit('close')
}
</script>

<style scoped lang="scss">
.minigame-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.overlay-content {
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.game-selection {
  background: white;
  border-radius: 20px;
  padding: 40px;
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selection-header {
  text-align: center;
  margin-bottom: 40px;
}

.selection-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.selection-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.game-card {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px 24px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(99, 102, 241, 0.3);
    border-color: #6366f1;
    background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  }
}

.game-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.game-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.game-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.game-difficulty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.difficulty-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.difficulty-stars {
  font-size: 14px;
}

.game-playing,
.game-waiting-results,
.game-results {
  display: flex;
  align-items: center;
  justify-content: center;
}

.waiting-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease-out;
  min-width: 400px;
  overflow: hidden;
  /* Empêcher la scrollbar */

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
    margin: 16px 0 8px 0;
  }

  p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }
}

.waiting-spinner {
  font-size: 64px;
  animation: spin 2s linear infinite;
  line-height: 1;
  /* Éviter le débordement vertical */
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
