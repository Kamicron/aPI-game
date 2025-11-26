<template>
  <div class="lobby">
    <div class="lobby-container">
      <h1 class="lobby-title">🎲 API Game</h1>
      <p class="lobby-subtitle">Créez ou rejoignez une partie</p>

      <div class="lobby-content">
        <!-- Créer une partie -->
        <div class="lobby-card">
          <h2 class="card-title">Créer une partie</h2>
          <div class="form-group">
            <label for="playerName">Votre pseudo</label>
            <input id="playerName" v-model="playerName" type="text" placeholder="Entrez votre pseudo" maxlength="20" />
          </div>
          <button class="btn btn-primary" @click="createRoom" :disabled="!playerName.trim()">
            Créer une partie
          </button>
        </div>

        <!-- Rejoindre une partie -->
        <div class="lobby-card">
          <h2 class="card-title">Rejoindre une partie</h2>
          <div class="form-group">
            <label for="joinPlayerName">Votre pseudo</label>
            <input id="joinPlayerName" v-model="joinPlayerName" type="text" placeholder="Entrez votre pseudo"
              maxlength="20" />
          </div>
          <div class="form-group">
            <label for="roomCode">Code de la partie</label>
            <input id="roomCode" v-model="roomCode" type="text" placeholder="Ex: ABC123" maxlength="6"
              @input="roomCode = roomCode.toUpperCase()" />
          </div>
          <button class="btn btn-secondary" @click="joinRoom" :disabled="!joinPlayerName.trim() || !roomCode.trim()">
            Rejoindre
          </button>
        </div>
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
  
  // Stocker les infos dans le localStorage
  localStorage.setItem('playerName', playerName.value)
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('roomCode', newRoomCode)
  
  // Rediriger vers la page de jeu
  await navigateTo(`/board?room=${newRoomCode}`)
}

async function joinRoom() {
  if (!joinPlayerName.value.trim() || !roomCode.value.trim()) return
  
  const playerId = `player-${Math.random().toString(36).slice(2, 11)}`
  
  // Stocker les infos dans le localStorage
  localStorage.setItem('playerName', joinPlayerName.value)
  localStorage.setItem('playerId', playerId)
  localStorage.setItem('roomCode', roomCode.value)
  
  // Rediriger vers la page de jeu
  await navigateTo(`/board?room=${roomCode.value}`)
}
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
  max-width: 900px;
  width: 100%;
}

.lobby-title {
  font-size: 48px;
  font-weight: 800;
  color: white;
  text-align: center;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
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

.lobby-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 24px 0;
}

.form-group {
  margin-bottom: 20px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #667eea;
    }

    &::placeholder {
      color: #9ca3af;
    }
  }
}

.btn {
  width: 100%;
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

  &-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  }

  &-secondary {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
    }
  }
}
</style>
