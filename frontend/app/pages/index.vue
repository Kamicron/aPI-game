<template>
  <div class="lobby">
    <div class="lobby-container">
      <h1 class="lobby-title">🎲 API Game</h1>
      <p class="lobby-subtitle">Créez ou rejoignez une partie</p>

      <div class="lobby-content">

        <lobby-card title="Créer une partie">
          <div class="form-group">
            <label class="apg-label" for="playerName">Votre pseudo</label>
            <input id="playerName" v-model="playerName" type="text" class="apg-input" placeholder="Entrez votre pseudo"
              maxlength="20" />
          </div>
          <button class="apg-btn apg-btn--primary" @click="createRoom" :disabled="!playerName.trim()">
            Créer une partie
          </button>
        </lobby-card>

        <lobby-card title="Rejoindre une partie">
          <div class="form-group">
            <label class="apg-label" for="joinPlayerName">Votre pseudo</label>
            <input id="joinPlayerName" v-model="joinPlayerName" type="text" class="apg-input"
              placeholder="Entrez votre pseudo" maxlength="20" />
          </div>
          <div class="form-group">
            <label class="apg-label" for="roomCode">Code de la partie</label>
            <input id="roomCode" v-model="roomCode" type="text" class="apg-input" placeholder="Ex: ABC123" maxlength="6"
              @input="roomCode = roomCode.toUpperCase()" />
          </div>
          <button class="apg-btn apg-btn--secondary" @click="joinRoom"
            :disabled="!joinPlayerName.trim() || !roomCode.trim()">
            Rejoindre
          </button>
        </lobby-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const playerName = ref('')
const joinPlayerName = ref('')
const roomCode = ref('')

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function createRoom() {
  if (!playerName.value.trim()) return

  const newRoomCode = generateRoomCode()
  const playerId = `player-${Math.random().toString(36).slice(2, 11)}`

  localStorage.setItem('playerName', playerName.value)
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('roomCode', newRoomCode)

  await navigateTo(`/lobby?room=${newRoomCode}`)
}

async function joinRoom() {
  if (!joinPlayerName.value.trim() || !roomCode.value.trim()) return

  const playerId = `player-${Math.random().toString(36).slice(2, 11)}`

  localStorage.setItem('playerName', joinPlayerName.value)
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('roomCode', roomCode.value)

  await navigateTo(`/lobby?room=${roomCode.value}`)
}
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
  max-width: 900px;
  width: 100%;
}

.lobby-title {
  font-size: 48px;
  font-weight: 800;
  color: red;
  text-align: center;
  margin: 0 0 8px 0;
  text-shadow: red;
}

.lobby-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin: 0 0 40px 0;
}

.lobby-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.form-group {
  margin-bottom: 20px;
}
</style>
