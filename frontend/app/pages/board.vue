<template>
  <div>
    <div v-if="!board">
      <h1>Chargement du plateau...</h1>
      <p>Connexion à la partie en cours...</p>
    </div>
    <div v-else>
      <BoardCanvas :board="board" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGameState } from '../../composables/useGameState'
import BoardCanvas from '../components/board/BoardCanvas.vue'

const route = useRoute()

// Récupérer les infos de la room
const roomCode = (route.query.room as string) || 'default-room'
const playerName = localStorage.getItem('playerName') || 'Guest'
const playerId = localStorage.getItem('playerId') || 'guest-' + Math.random().toString(36).slice(2)
const playerColor = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#6366f1'][Math.floor(Math.random() * 5)]

// Vérifier que l'utilisateur a bien un roomCode
onMounted(() => {
  if (!route.query.room || !localStorage.getItem('playerName') || !localStorage.getItem('playerId')) {
    // Rediriger vers l'accueil si pas de room
    navigateTo('/')
  }
})

// Connexion au jeu et récupération du plateau
const { gameState } = useGameState(roomCode, playerId, playerName, playerColor)

// Le plateau vient du gameState
const board = computed(() => gameState.value?.board || null)
</script>

<style scoped lang="scss">
h1 {
  margin-bottom: 16px;
}

.error {
  color: #c62828;
}

button {
  margin-top: 12px;
}
</style>
