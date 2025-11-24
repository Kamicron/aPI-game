<template>
  <div class="panel panel--chat">
    <div class="panel-header">
      <h3 class="panel-title">💬 Chat</h3>
      <span class="status-indicator" :class="{ 'status-indicator--connected': connected }"></span>
    </div>
    <div class="panel-content panel-content--chat" ref="chatMessagesEl">
      <div v-for="(message, index) in messages" :key="index" class="chat-message"
        :class="`chat-message--${message.type}`">
        <span v-if="message.type === 'user'" class="message-author">{{ message.authorId }}:</span>
        <span class="message-content">{{ message.content }}</span>
      </div>
    </div>
    <div class="panel-footer">
      <input v-model="newMessage" @keyup.enter="handleSend" type="text" placeholder="Envoyer un message..."
        class="input" />
      <button @click="handleSend" class="btn btn--icon">
        ➤
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

interface ChatMessage {
  type: 'user' | 'system'
  authorId?: string
  content: string
  timestamp: string
}

const props = defineProps<{
  messages: ChatMessage[]
  connected: boolean
}>()

const emit = defineEmits<{
  'send-message': [message: string]
}>()

const newMessage = ref('')
const chatMessagesEl = ref<HTMLElement | null>(null)

const handleSend = () => {
  if (!newMessage.value.trim()) return
  emit('send-message', newMessage.value)
  newMessage.value = ''
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

watch(() => props.messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped lang="scss">
.panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  /* flex-basis 0 pour partager l'espace quand un autre panneau est présent */
  &.panel--chat {
    flex: 1 1 0;
  }
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: background 0.3s;

  &--connected {
    background: #10b981;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  &--chat {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

.chat-message {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;

  &--user {
    background: #f3f4f6;
    color: var(--text-primary);
  }

  &--system {
    background: #dbeafe;
    color: #1e40af;
    font-style: italic;
  }
}

.message-author {
  font-weight: 600;
  margin-right: 6px;
  color: var(--primary-color);
}

.message-content {
  word-break: break-word;
}

.panel-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}

.input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: var(--primary-color);
  }
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &--icon {
    width: 44px;
    height: 44px;
    padding: 0;
    background: var(--primary-color);
    color: white;
    font-size: 18px;
    justify-content: center;

    &:hover {
      background: var(--primary-hover);
    }
  }
}
</style>
