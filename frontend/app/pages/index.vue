<template>
  <div>
    <h1>Accueil</h1>
    <button @click="rollDice(2, 6)">lancer 2d6</button>

    <div class="dice-list">
      <DiceD6 v-for="(value, index) in diceValues" backgroundColor="#ffff00" :key="index"
        :value="(value as 1 | 2 | 3 | 4 | 5 | 6)" :roll-id="rollId" />
      <DiceD6 v-for="(value, index) in diceValues" backgroundColor="#00254f" :key="index"
        :value="(value as 1 | 2 | 3 | 4 | 5 | 6)" :roll-id="rollId" />
    </div>

    <div class="chat">
      <h2>Chat de test</h2>
      <div class="chat__status">Statut: {{ connected ? 'connecté' : 'déconnecté' }}</div>
      <div class="chat__messages">
        <div v-for="(msg, index) in messages" :key="index" class="chat__message" :class="`chat__message--${msg.type}`">
          <span v-if="msg.type === 'user'" class="chat__author">{{ msg.authorId }}:</span>
          <span class="chat__content">{{ msg.content }}</span>
        </div>
      </div>
      <form class="chat__form" @submit.prevent="handleSend">
        <input v-model="draft" class="chat__input" type="text" placeholder="Écrire un message..." />
        <button type="submit">Envoyer</button>
      </form>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DiceD6 from '../components/dices/dice-d6.vue'
import { useGameChat } from '../../composables/useGameChat'

const { diceValues, rollId, roll: rollDice } = useRollDice()

const roomId = ref('test-room-1')
const playerId = ref(`guest-${Math.random().toString(36).slice(2, 8)}`)

const { messages, connected, sendMessage } = useGameChat(roomId, playerId)

const draft = ref('')

function handleSend() {
  if (!draft.value.trim()) return
  sendMessage(draft.value)
  draft.value = ''
}
</script>


<style scoped lang="scss">
h1 {
  color: red;
}

.dice-list {
  margin-top: 16px;
  display: flex;
  gap: 16px;
}

.chat {
  margin-top: 32px;
  max-width: 480px;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 12px;
}

.chat__status {
  font-size: 12px;
  color: #555;
  margin-bottom: 8px;
}

.chat__messages {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fafafa;
  margin-bottom: 8px;
}

.chat__message {
  font-size: 14px;
  margin-bottom: 4px;
}

.chat__message--system {
  color: #555;
  font-style: italic;
}

.chat__author {
  font-weight: 600;
  margin-right: 4px;
}

.chat__form {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.chat__input {
  flex: 1;
  padding: 4px 8px;
}
</style>
