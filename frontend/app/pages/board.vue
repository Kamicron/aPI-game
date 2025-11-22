<template>
  <div>
    <h1>Plateau de jeu</h1>

    <div v-if="loading">Chargement du plateau...</div>
    <div v-else-if="error" class="error">Erreur : {{ error }}</div>
    <div v-else-if="board">
      <BoardCanvas :board="board" />
      <button type="button" @click="fetchBoard">Regénérer le plateau</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBoard } from '../../composables/useBoard'
import BoardCanvas from '../components/board/BoardCanvas.vue'

const { board, loading, error, fetchBoard } = useBoard()
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
